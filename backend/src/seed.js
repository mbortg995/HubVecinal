import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import Organization from './models/Organization.js';
import Community from './models/Community.js';
import Membership from './models/Membership.js';
import Invitation from './models/Invitation.js';
import Meeting from './models/Meeting.js';
import Topic from './models/Topic.js';
import Transaction from './models/Transaction.js';

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
    Organization.deleteMany({}),
    Community.deleteMany({}),
    Membership.deleteMany({}),
    Invitation.deleteMany({}),
    Meeting.deleteMany({}),
    Topic.deleteMany({}),
    Transaction.deleteMany({}),
  ]);

  console.log('Creando organización (administradora)...');
  const org = await Organization.create({
    name: 'Administraciones García',
    contactEmail: 'super@hubvecinal.dev',
  });

  console.log('Creando superadmin y usuarios...');
  const superadmin = await User.create({
    name: 'Ana García (Administradora)',
    email: 'super@hubvecinal.dev',
    password: 'password123',
    platformRole: 'superadmin',
    organization: org._id,
  });
  org.createdBy = superadmin._id;
  await org.save();

  const adminFincas = await User.create({
    name: 'Pedro Gestor',
    email: 'admin@hubvecinal.dev',
    password: 'password123',
    platformRole: 'member',
  });

  const presidente = await User.create({
    name: 'Lucía Fernández',
    email: 'presidente@hubvecinal.dev',
    password: 'password123',
    platformRole: 'member',
  });

  const propietarios = await Promise.all(
    [
      { name: 'Carlos Ruiz', email: 'carlos@hubvecinal.dev', unit: '1ºA' },
      { name: 'Marta Sánchez', email: 'marta@hubvecinal.dev', unit: '2ºC' },
      { name: 'Javier Moreno', email: 'javier@hubvecinal.dev', unit: '4ºA' },
    ].map(async (p) => ({
      user: await User.create({ name: p.name, email: p.email, password: 'password123', platformRole: 'member' }),
      unit: p.unit,
    }))
  );

  console.log('Creando comunidades de la organización...');
  const olivos = await Community.create({
    name: 'Comunidad Residencial Los Olivos',
    address: 'Calle de la Paz, 14, 28012 Madrid',
    organization: org._id,
    createdBy: superadmin._id,
  });

  const robles = await Community.create({
    name: 'Edificio Los Robles',
    address: 'Avenida del Parque, 3, 28040 Madrid',
    organization: org._id,
    createdBy: superadmin._id,
  });

  console.log('Creando membresías...');
  await Membership.create([
    { user: adminFincas._id, community: olivos._id, role: 'admin' },
    { user: adminFincas._id, community: robles._id, role: 'admin' },
    { user: presidente._id, community: olivos._id, role: 'president', unit: '3ºB', coefficient: 25 },
    ...propietarios.map((p) => ({
      user: p.user._id,
      community: olivos._id,
      role: 'owner',
      unit: p.unit,
      coefficient: 25,
      // Javier (4ºA) es inquilino: la vivienda está alquilada.
      occupantType: p.user.email.startsWith('javier') ? 'tenant' : 'owner',
    })),
  ]);

  console.log('Creando una invitación pendiente de ejemplo...');
  await Invitation.create({
    organization: org._id,
    community: olivos._id,
    email: 'nuevo.vecino@hubvecinal.dev',
    role: 'owner',
    unit: '5ºA',
    invitedBy: presidente._id,
  });

  console.log('Creando juntas...');
  const juntaCelebrada = await Meeting.create({
    community: olivos._id,
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
      community: olivos._id,
      title: 'Junta Extraordinaria: derrama ascensor',
      date: daysFromNow(12),
      location: 'Local social, planta baja',
      status: 'upcoming',
      notes: 'Votación de la derrama para la modernización del ascensor.',
      createdBy: presidente._id,
    },
    {
      community: olivos._id,
      title: 'Junta Ordinaria de Otoño',
      date: daysFromNow(95),
      location: 'Por confirmar',
      status: 'upcoming',
      createdBy: presidente._id,
    },
  ]);

  console.log('Creando temas...');
  await Topic.create([
    {
      community: olivos._id,
      title: 'Modernización del ascensor',
      description:
        'El ascensor sufre averías frecuentes. Pendiente de aprobar la derrama en la próxima junta.',
      status: 'pending',
      createdBy: presidente._id,
    },
    {
      community: olivos._id,
      title: 'Ruidos en el patio interior',
      description: 'Varios vecinos reportan ruidos nocturnos. Estudiar instalación de cartelería.',
      status: 'pending',
      createdBy: propietarios[0].user._id,
    },
    {
      community: olivos._id,
      title: 'Pintura del portal',
      description: 'El portal necesitaba una mano de pintura.',
      status: 'resolved',
      resolution: 'Aprobado por unanimidad. Trabajo finalizado por la empresa PinturasMad.',
      meeting: juntaCelebrada._id,
      createdBy: presidente._id,
    },
    {
      community: olivos._id,
      title: 'Revisión de extintores',
      description: 'Caducidad de los extintores de las zonas comunes.',
      status: 'resolved',
      resolution: 'Contratada revisión anual con la empresa SeguriFincas.',
      meeting: juntaCelebrada._id,
      createdBy: adminFincas._id,
    },
  ]);

  console.log('Creando movimientos de las arcas...');
  await Transaction.create([
    { community: olivos._id, type: 'income', concept: 'Cuotas comunidad - trimestre actual', amount: 4800, date: daysFromNow(-30), createdBy: adminFincas._id },
    { community: olivos._id, type: 'expense', concept: 'Mantenimiento ascensor', amount: 320, date: daysFromNow(-25), createdBy: adminFincas._id },
    { community: olivos._id, type: 'expense', concept: 'Pintura del portal', amount: 1150, date: daysFromNow(-18), createdBy: adminFincas._id },
    { community: olivos._id, type: 'expense', concept: 'Limpieza zonas comunes (mensual)', amount: 450, date: daysFromNow(-10), createdBy: adminFincas._id },
    { community: olivos._id, type: 'income', concept: 'Alquiler antena telefonía azotea', amount: 600, date: daysFromNow(-5), createdBy: adminFincas._id },
  ]);

  console.log('\n✓ Seed completado. Usuarios de prueba (password: password123):');
  console.log('  • Superadmin (administradora): super@hubvecinal.dev  → gestiona Los Olivos y Los Robles');
  console.log('  • Admin de fincas:             admin@hubvecinal.dev');
  console.log('  • Presidente (Los Olivos):     presidente@hubvecinal.dev');
  console.log('  • Propietarios:                carlos@, marta@, javier@hubvecinal.dev');
  console.log('  • Invitación pendiente de ejemplo para: nuevo.vecino@hubvecinal.dev\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
