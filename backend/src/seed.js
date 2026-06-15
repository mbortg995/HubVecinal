import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import Community from './models/Community.js';
import Meeting from './models/Meeting.js';
import Topic from './models/Topic.js';
import Transaction from './models/Transaction.js';

// Devuelve una fecha relativa a hoy (días positivos = futuro).
function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(19, 0, 0, 0);
  return d;
}

async function seed() {
  await connectDB(process.env.MONGODB_URI);

  console.log('Limpiando colecciones...');
  await Promise.all([
    User.deleteMany({}),
    Community.deleteMany({}),
    Meeting.deleteMany({}),
    Topic.deleteMany({}),
    Transaction.deleteMany({}),
  ]);

  console.log('Creando usuarios...');
  // El password se hashea con el hook pre-save, por eso usamos create() en bucle.
  const presidente = await User.create({
    name: 'Lucía Fernández',
    email: 'presidente@hubvecinal.dev',
    password: 'password123',
    role: 'owner',
    unit: '3ºB',
    isPresident: true,
  });

  const admin = await User.create({
    name: 'Administraciones García',
    email: 'admin@hubvecinal.dev',
    password: 'password123',
    role: 'admin',
  });

  const propietarios = await Promise.all(
    [
      { name: 'Carlos Ruiz', email: 'carlos@hubvecinal.dev', unit: '1ºA' },
      { name: 'Marta Sánchez', email: 'marta@hubvecinal.dev', unit: '2ºC' },
      { name: 'Javier Moreno', email: 'javier@hubvecinal.dev', unit: '4ºA' },
    ].map((p) =>
      User.create({ ...p, password: 'password123', role: 'owner', isPresident: false })
    )
  );

  console.log('Creando comunidad...');
  const community = await Community.create({
    name: 'Comunidad Residencial Los Olivos',
    address: 'Calle de la Paz, 14, 28012 Madrid',
    joinCode: 'OLIVOS24',
    president: presidente._id,
    administrator: admin._id,
  });

  // Vincular a todos los propietarios y al presidente con la comunidad.
  presidente.community = community._id;
  await presidente.save();
  await Promise.all(
    propietarios.map((p) => {
      p.community = community._id;
      return p.save();
    })
  );

  console.log('Creando juntas...');
  const juntaCelebrada = await Meeting.create({
    community: community._id,
    title: 'Junta Ordinaria de Primavera',
    date: daysFromNow(-21),
    location: 'Portal del edificio',
    status: 'held',
    notes:
      'Se aprobaron las cuentas del ejercicio anterior y el presupuesto para el arreglo del ascensor.',
    createdBy: presidente._id,
  });

  await Meeting.create([
    {
      community: community._id,
      title: 'Junta Extraordinaria: derrama ascensor',
      date: daysFromNow(12),
      location: 'Local social, planta baja',
      status: 'upcoming',
      notes: 'Votación de la derrama para la modernización del ascensor.',
      createdBy: presidente._id,
    },
    {
      community: community._id,
      title: 'Junta Ordinaria de Otoño',
      date: daysFromNow(95),
      location: 'Por confirmar',
      status: 'upcoming',
      notes: '',
      createdBy: presidente._id,
    },
  ]);

  console.log('Creando temas...');
  await Topic.create([
    {
      community: community._id,
      title: 'Modernización del ascensor',
      description:
        'El ascensor sufre averías frecuentes. Pendiente de aprobar la derrama en la próxima junta.',
      status: 'pending',
      createdBy: presidente._id,
    },
    {
      community: community._id,
      title: 'Ruidos en el patio interior',
      description: 'Varios vecinos reportan ruidos nocturnos. Estudiar instalación de cartelería.',
      status: 'pending',
      createdBy: propietarios[0]._id,
    },
    {
      community: community._id,
      title: 'Pintura del portal',
      description: 'El portal necesitaba una mano de pintura.',
      status: 'resolved',
      resolution: 'Aprobado por unanimidad. Trabajo finalizado por la empresa PinturasMad.',
      meeting: juntaCelebrada._id,
      createdBy: presidente._id,
    },
    {
      community: community._id,
      title: 'Revisión de extintores',
      description: 'Caducidad de los extintores de las zonas comunes.',
      status: 'resolved',
      resolution: 'Contratada revisión anual con la empresa SeguriFincas.',
      meeting: juntaCelebrada._id,
      createdBy: admin._id,
    },
  ]);

  console.log('Creando movimientos de las arcas...');
  await Transaction.create([
    {
      community: community._id,
      type: 'income',
      concept: 'Cuotas comunidad - trimestre actual',
      amount: 4800,
      date: daysFromNow(-30),
      createdBy: admin._id,
    },
    {
      community: community._id,
      type: 'expense',
      concept: 'Mantenimiento ascensor',
      amount: 320,
      date: daysFromNow(-25),
      createdBy: admin._id,
    },
    {
      community: community._id,
      type: 'expense',
      concept: 'Pintura del portal',
      amount: 1150,
      date: daysFromNow(-18),
      createdBy: admin._id,
    },
    {
      community: community._id,
      type: 'expense',
      concept: 'Limpieza zonas comunes (mensual)',
      amount: 450,
      date: daysFromNow(-10),
      createdBy: admin._id,
    },
    {
      community: community._id,
      type: 'income',
      concept: 'Alquiler antena telefonía azotea',
      amount: 600,
      date: daysFromNow(-5),
      createdBy: admin._id,
    },
  ]);

  console.log('\n✓ Seed completado. Usuarios de prueba (password: password123):');
  console.log('  • Presidente:   presidente@hubvecinal.dev');
  console.log('  • Administrador: admin@hubvecinal.dev');
  console.log('  • Propietarios:  carlos@hubvecinal.dev, marta@hubvecinal.dev, javier@hubvecinal.dev');
  console.log('  • Código para unirse a la comunidad: OLIVOS24\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
