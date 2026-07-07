import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Usuarios
  const adminEmail = 'admin@sena.edu.co';
  const existingAdmin = await prisma.user.findFirst({
    where: { email: adminEmail, isDeleted: false },
  });

  let admin;
  if (!existingAdmin) {
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await bcrypt.hash('AdminSENA2024', 10),
        fullName: 'Administrador SENA',
        role: 'ADMIN',
        shift: 'MORNING',
        isActive: true,
      },
    });
    console.log('✅ Usuario administrador creado: admin@sena.edu.co / AdminSENA2024');
  } else {
    admin = existingAdmin;
    console.log('ℹ️ El usuario administrador ya existe');
  }

  const instructorData = [
    { fullName: 'Carlos Mendoza', email: 'cmendoza@sena.edu.co', shift: 'MORNING' },
    { fullName: 'María Gómez', email: 'mgomez@misena.edu.co', shift: 'AFTERNOON' },
    { fullName: 'Luis Torres', email: 'ltorres@misena.edu.co', shift: 'NIGHT' },
  ];

  const instructors = [];
  for (const data of instructorData) {
    const exists = await prisma.user.findFirst({ where: { email: data.email, isDeleted: false } });
    if (!exists) {
      const created = await prisma.user.create({
        data: {
          ...data,
          passwordHash: await bcrypt.hash('Instructor2024', 10),
          role: 'INSTRUCTOR',
          isActive: true,
        },
      });
      instructors.push(created);
      console.log(`✅ Instructor creado: ${data.email}`);
    } else {
      instructors.push(exists);
    }
  }

  // Ambiente
  const defaultEnvironment = await prisma.environment.findFirst({ where: { code: '104' } });
  let environmentId;
  if (!defaultEnvironment) {
    const env = await prisma.environment.create({
      data: {
        code: '104',
        name: 'Ambiente 104',
        location: 'SENA Quirigüá',
        isActive: true,
      },
    });
    environmentId = env.id;
    console.log('✅ Ambiente 104 creado');
  } else {
    environmentId = defaultEnvironment.id;
  }

  // Categorías
  const categoryNames = [
    { name: 'Audiovisuales', description: 'Equipos de audio, video y presentaciones' },
    { name: 'Cómputo', description: 'Portátiles, torres, periféricos y accesorios' },
    { name: 'Redes', description: 'Routers, switches, cables y herramientas de red' },
    { name: 'Herramientas', description: 'Herramientas manuales y kits de mantenimiento' },
    { name: 'Componentes', description: 'Piezas internas de equipos de cómputo' },
  ];

  const categories = {};
  for (const cat of categoryNames) {
    const upserted = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
    categories[cat.name] = upserted.id;
    console.log(`✅ Categoría asegurada: ${cat.name}`);
  }

  // Ítems simples
  const simpleItems = [
    {
      code: 'SENA-INV-1042',
      name: 'Computador Portátil HP ProBook',
      description: 'Portátil Core i7, 16GB RAM, SSD 512GB',
      categoryName: 'Cómputo',
      minStock: 2,
      unit: 'UNIDAD',
      isConsumable: false,
      quantity: 5,
    },
    {
      code: 'SENA-INV-3051',
      name: 'Cable de Red UTP Cat 6A',
      description: 'Cable de red categoría 6A, bobina de 30 metros',
      categoryName: 'Redes',
      minStock: 10,
      unit: 'METRO',
      isConsumable: true,
      quantity: 30,
    },
    {
      code: 'SENA-INV-8022',
      name: 'Switch Cisco 24 Puertos',
      description: 'Switch administrable de 24 puertos gigabit',
      categoryName: 'Redes',
      minStock: 1,
      unit: 'UNIDAD',
      isConsumable: false,
      quantity: 2,
    },
    {
      code: 'SENA-INV-9001',
      name: 'Cable HDMI 2m',
      description: 'Cable HDMI versión 2.0 de 2 metros',
      categoryName: 'Redes',
      minStock: 5,
      unit: 'UNIDAD',
      isConsumable: true,
      quantity: 12,
    },
    {
      code: 'SENA-INV-1100',
      name: 'Kit Destornilladores',
      description: 'Kit de destornilladores de precisión',
      categoryName: 'Herramientas',
      minStock: 2,
      unit: 'UNIDAD',
      isConsumable: false,
      quantity: 5,
    },
  ];

  const createdItems = {};
  for (const item of simpleItems) {
    const exists = await prisma.item.findFirst({ where: { code: item.code, isDeleted: false } });
    if (!exists) {
      const created = await prisma.item.create({
        data: {
          code: item.code,
          name: item.name,
          description: item.description,
          categoryId: categories[item.categoryName],
          minStock: item.minStock,
          unit: item.unit,
          isConsumable: item.isConsumable,
          isActive: true,
        },
      });
      createdItems[item.code] = created;
      console.log(`✅ Ítem creado: ${item.name}`);

      const units = Array.from({ length: item.quantity }, (_, i) => ({
        serialNumber: `${item.code}-${String(i + 1).padStart(3, '0')}`,
        environmentId,
        status: 'AVAILABLE',
        physicalState: 'GOOD',
      }));

      await prisma.inventoryUnit.createMany({
        data: units.map((u) => ({ ...u, itemId: created.id })),
      });
      console.log(`✅ ${units.length} unidades generadas para ${item.name}`);
    } else {
      createdItems[item.code] = exists;
    }
  }

  // Ítems componentes para la torre
  const componentItemsData = [
    { code: 'COMP-MB-001', name: 'Tarjeta Madre ATX', categoryName: 'Componentes', quantity: 5 },
    { code: 'COMP-RAM-001', name: 'Memoria RAM 8GB DDR4', categoryName: 'Componentes', quantity: 10 },
    { code: 'COMP-CPU-001', name: 'Procesador Intel Core i5', categoryName: 'Componentes', quantity: 5 },
    { code: 'COMP-GPU-001', name: 'Tarjeta Gráfica GTX 1650', categoryName: 'Componentes', quantity: 5 },
    { code: 'COMP-SSD-001', name: 'Disco SSD 500GB', categoryName: 'Componentes', quantity: 5 },
    { code: 'COMP-PSU-001', name: 'Fuente de Poder 500W', categoryName: 'Componentes', quantity: 5 },
  ];

  const componentItems = [];
  for (const item of componentItemsData) {
    const exists = await prisma.item.findFirst({ where: { code: item.code, isDeleted: false } });
    let created;
    if (!exists) {
      created = await prisma.item.create({
        data: {
          code: item.code,
          name: item.name,
          categoryId: categories[item.categoryName],
          minStock: 1,
          unit: 'UNIDAD',
          isConsumable: false,
          isActive: true,
        },
      });
      console.log(`✅ Componente creado: ${item.name}`);

      const units = Array.from({ length: item.quantity }, (_, i) => ({
        serialNumber: `${item.code}-${String(i + 1).padStart(3, '0')}`,
        environmentId,
        status: 'AVAILABLE',
        physicalState: 'GOOD',
      }));

      await prisma.inventoryUnit.createMany({
        data: units.map((u) => ({ ...u, itemId: created.id })),
      });
      console.log(`✅ ${units.length} unidades generadas para ${item.name}`);
    } else {
      created = exists;
    }
    componentItems.push(created);
  }

  // Ítem compuesto: Torre PC
  const towerCode = 'SENA-INV-7001';
  let towerItem = await prisma.item.findFirst({ where: { code: towerCode, isDeleted: false } });
  if (!towerItem) {
    towerItem = await prisma.item.create({
      data: {
        code: towerCode,
        name: 'Torre PC Completa',
        description: 'Torre de computador con componentes internos ensamblados',
        categoryId: categories['Cómputo'],
        minStock: 1,
        unit: 'UNIDAD',
        isConsumable: false,
        isActive: true,
        components: {
          create: componentItems.map((c) => ({
            childItemId: c.id,
            quantity: 1,
            isRequired: true,
          })),
        },
      },
    });
    console.log('✅ Ítem compuesto creado: Torre PC Completa');

    const towerQuantity = 3;
    const towerUnits = Array.from({ length: towerQuantity }, (_, i) => ({
      serialNumber: `${towerCode}-${String(i + 1).padStart(3, '0')}`,
      environmentId,
      status: 'AVAILABLE',
      physicalState: 'GOOD',
    }));

    await prisma.inventoryUnit.createMany({
      data: towerUnits.map((u) => ({ ...u, itemId: towerItem.id })),
    });
    console.log(`✅ ${towerQuantity} unidades generadas para Torre PC Completa`);
  }

  // Ensamblar las primeras 2 torres con todos sus componentes
  const towerUnits = await prisma.inventoryUnit.findMany({
    where: { itemId: towerItem.id },
    orderBy: { id: 'asc' },
  });

  for (let i = 0; i < Math.min(2, towerUnits.length); i += 1) {
    const towerUnit = towerUnits[i];
    for (const componentItem of componentItems) {
      const availableUnit = await prisma.inventoryUnit.findFirst({
        where: { itemId: componentItem.id, status: 'AVAILABLE', parentUnitId: null },
      });
      if (availableUnit) {
        await prisma.inventoryUnit.update({
          where: { id: availableUnit.id },
          data: { parentUnitId: towerUnit.id },
        });
      }
    }
    console.log(`✅ Torre ${towerUnit.serialNumber} ensamblada`);
  }

  // La tercera torre quedará incompleta (sin GPU ni SSD) para probar el flujo incompleto
  if (towerUnits.length >= 3) {
    const incompleteTower = towerUnits[2];
    const requiredForIncomplete = ['COMP-MB-001', 'COMP-RAM-001', 'COMP-CPU-001', 'COMP-PSU-001'];
    for (const code of requiredForIncomplete) {
      const componentItem = componentItems.find((c) => c.code === code);
      const availableUnit = await prisma.inventoryUnit.findFirst({
        where: { itemId: componentItem.id, status: 'AVAILABLE', parentUnitId: null },
      });
      if (availableUnit) {
        await prisma.inventoryUnit.update({
          where: { id: availableUnit.id },
          data: { parentUnitId: incompleteTower.id },
        });
      }
    }
    console.log(`✅ Torre ${incompleteTower.serialNumber} ensamblada incompleta`);
  }

  // Solicitudes de prueba
  const requestDate = new Date();

  const requestCodeExists = async (code) => prisma.request.findFirst({ where: { code } });

  // Solicitud 1: Pendiente
  const pendingCode = `SOL-${requestDate.toISOString().slice(0, 10).replace(/-/g, '')}-001`;
  if (await requestCodeExists(pendingCode)) {
    console.log(`ℹ️ Solicitud ${pendingCode} ya existe, omitiendo`);
  } else {
  const pendingRequest = await prisma.request.create({
    data: {
      code: pendingCode,
      requesterId: instructors[0].id,
      environmentId,
      shift: 'MORNING',
      status: 'PENDING',
      observations: 'Solicitud de prueba en estado pendiente',
      requestItems: {
        create: [
          { itemId: createdItems['SENA-INV-3051'].id, requestedQty: 5 },
          { itemId: createdItems['SENA-INV-1042'].id, requestedQty: 1 },
        ],
      },
    },
  });
  console.log(`✅ Solicitud pendiente creada: ${pendingRequest.code}`);
  }

  // Solicitud 2: Entregada (préstamo activo) - torre completa + kit destornilladores
  const laptop = createdItems['SENA-INV-1042'];
  const kit = createdItems['SENA-INV-1100'];
  const deliveredCode = `SOL-${requestDate.toISOString().slice(0, 10).replace(/-/g, '')}-002`;
  if (await requestCodeExists(deliveredCode)) {
    console.log(`ℹ️ Solicitud ${deliveredCode} ya existe, omitiendo`);
  } else {
  const deliveredRequest = await prisma.request.create({
    data: {
      code: deliveredCode,
      requesterId: instructors[1].id,
      environmentId,
      shift: 'AFTERNOON',
      status: 'DELIVERED',
      approvedById: admin.id,
      approvedAt: new Date(),
      packedById: admin.id,
      packedAt: new Date(),
      deliveredById: admin.id,
      deliveredAt: new Date(),
      observations: 'Préstamo activo de torre completa',
      requestItems: {
        create: [
          { itemId: towerItem.id, requestedQty: 1, approvedQty: 1, deliveredQty: 1 },
          { itemId: kit.id, requestedQty: 1, approvedQty: 1, deliveredQty: 1 },
        ],
      },
    },
  });

  const deliveredRequestItems = await prisma.requestItem.findMany({
    where: { requestId: deliveredRequest.id },
  });

  for (const requestItem of deliveredRequestItems) {
    const isTower = requestItem.itemId === towerItem.id;
    const unitsToAssign = isTower
      ? await prisma.inventoryUnit.findMany({
          where: { itemId: towerItem.id, status: 'AVAILABLE' },
          take: 1,
          include: { childUnits: true },
        })
      : await prisma.inventoryUnit.findMany({
          where: { itemId: kit.id, status: 'AVAILABLE' },
          take: 1,
        });

    for (const unit of unitsToAssign) {
      await prisma.inventoryUnit.update({ where: { id: unit.id }, data: { status: 'LOANED' } });
      await prisma.requestItemUnit.create({
        data: {
          requestItemId: requestItem.id,
          inventoryUnitId: unit.id,
          loanedAt: new Date(),
        },
      });

      if (isTower) {
        for (const child of unit.childUnits) {
          await prisma.inventoryUnit.update({ where: { id: child.id }, data: { status: 'LOANED' } });
          await prisma.requestItemUnit.create({
            data: {
              requestItemId: requestItem.id,
              inventoryUnitId: child.id,
              loanedAt: new Date(),
            },
          });
        }
      }
    }
  }
  console.log(`✅ Solicitud entregada creada: ${deliveredRequest.code}`);
  }

  // Solicitud 3: Parcialmente devuelta - portátil + cable HDMI
  const partialCode = `SOL-${requestDate.toISOString().slice(0, 10).replace(/-/g, '')}-003`;
  if (await requestCodeExists(partialCode)) {
    console.log(`ℹ️ Solicitud ${partialCode} ya existe, omitiendo`);
  } else {
  const partialRequest = await prisma.request.create({
    data: {
      code: partialCode,
      requesterId: instructors[2].id,
      environmentId,
      shift: 'NIGHT',
      status: 'PARTIALLY_RETURNED',
      approvedById: admin.id,
      approvedAt: new Date(),
      packedById: admin.id,
      packedAt: new Date(),
      deliveredById: admin.id,
      deliveredAt: new Date(),
      observations: 'Solicitud con devolución parcial',
      requestItems: {
        create: [
          { itemId: laptop.id, requestedQty: 1, approvedQty: 1, deliveredQty: 1, returnedQty: 1 },
          { itemId: createdItems['SENA-INV-9001'].id, requestedQty: 2, approvedQty: 2, deliveredQty: 2, returnedQty: 1 },
        ],
      },
    },
  });

  const partialItems = await prisma.requestItem.findMany({
    where: { requestId: partialRequest.id },
  });

  for (const requestItem of partialItems) {
    const unitsToAssign = await prisma.inventoryUnit.findMany({
      where: { itemId: requestItem.itemId, status: 'AVAILABLE' },
      take: requestItem.deliveredQty,
    });

    for (let i = 0; i < unitsToAssign.length; i += 1) {
      const unit = unitsToAssign[i];
      const isReturned = i < requestItem.returnedQty;
      await prisma.inventoryUnit.update({
        where: { id: unit.id },
        data: { status: isReturned ? 'AVAILABLE' : 'LOANED' },
      });
      await prisma.requestItemUnit.create({
        data: {
          requestItemId: requestItem.id,
          inventoryUnitId: unit.id,
          loanedAt: new Date(),
          returnedAt: isReturned ? new Date() : null,
          returnedById: isReturned ? admin.id : null,
          physicalStateReturned: isReturned ? 'GOOD' : null,
        },
      });
    }
  }
  console.log(`✅ Solicitud parcialmente devuelta creada: ${partialRequest.code}`);
  }

  // Solicitud 4: Completada
  const completedCode = `SOL-${requestDate.toISOString().slice(0, 10).replace(/-/g, '')}-004`;
  if (await requestCodeExists(completedCode)) {
    console.log(`ℹ️ Solicitud ${completedCode} ya existe, omitiendo`);
  } else {
  const completedRequest = await prisma.request.create({
    data: {
      code: completedCode,
      requesterId: instructors[0].id,
      environmentId,
      shift: 'MORNING',
      status: 'COMPLETED',
      approvedById: admin.id,
      approvedAt: new Date(),
      packedById: admin.id,
      packedAt: new Date(),
      deliveredById: admin.id,
      deliveredAt: new Date(),
      completedAt: new Date(),
      observations: 'Solicitud completada',
      requestItems: {
        create: [
          { itemId: createdItems['SENA-INV-8022'].id, requestedQty: 1, approvedQty: 1, deliveredQty: 1, returnedQty: 1 },
        ],
      },
    },
  });

  const completedItems = await prisma.requestItem.findMany({
    where: { requestId: completedRequest.id },
  });

  for (const requestItem of completedItems) {
    const unit = await prisma.inventoryUnit.findFirst({
      where: { itemId: requestItem.itemId, status: 'AVAILABLE' },
    });
    if (unit) {
      await prisma.requestItemUnit.create({
        data: {
          requestItemId: requestItem.id,
          inventoryUnitId: unit.id,
          loanedAt: new Date(),
          returnedAt: new Date(),
          returnedById: admin.id,
          physicalStateReturned: 'GOOD',
        },
      });
    }
  }
  console.log(`✅ Solicitud completada creada: ${completedRequest.code}`);
  }

  console.log('\n🌱 Seed completado. Datos de prueba listos.');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
