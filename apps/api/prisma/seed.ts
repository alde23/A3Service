import { PrismaClient, UserRole, JobStatus, JobPriority, SyncAction, SyncResult, WarrantyStatus } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { z } from 'zod';
import { config as dotenvConfig } from 'dotenv';
import { join } from 'path';
import { existsSync } from 'fs';

// Load .env manually — seed runs outside NestJS, no ConfigModule available
const envPath = join(process.cwd(), '../../.env');
if (existsSync(envPath)) {
  dotenvConfig({ path: envPath });
}

// Validate required env vars before Prisma initialises
const EnvSchema = z.object({
  DATABASE_URL: z.url('DATABASE_URL must be a valid URL'),
  DIRECT_URL:   z.url('DIRECT_URL must be a valid URL'),
});

EnvSchema.parse(process.env);

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// ─────────────────────────────────────────
// SEED DATA
// ─────────────────────────────────────────

const SEED = {
  users: [
    {
      id:                 '0197f8a0-0001-7000-8000-000000000001',
      username:           'alic.kovac',
      email:              'alic.kovac@a3service.ba',
      passwordHash:       '$2b$10$B2cTzNdYbkDCvRR7jrshW.5XdCm02mi1muL62ph5Ok2yLyYMGPpmu', // 'password123'
      role:               UserRole.MANAGER,
      languagePreference: 'bs',
      profile: {
        specialization:    'HVAC Systems Management',
        yearsExperience:   12,
        certificateNumber: 'BA-MGR-2014-0042',
        bio:               'Senior manager with 12 years in commercial HVAC.',
      },
    },
    {
      id:                 '0197f8a0-0001-7000-8000-000000000002',
      username:           'emir.basic',
      email:              'emir.basic@a3service.ba',
      passwordHash:       '$2b$10$B2cTzNdYbkDCvRR7jrshW.5XdCm02mi1muL62ph5Ok2yLyYMGPpmu', // 'password123'
      role:               UserRole.TECHNICIAN,
      languagePreference: 'bs',
      profile: {
        specialization:    'Boiler Installation & Repair',
        yearsExperience:   7,
        certificateNumber: 'BA-TECH-2018-0117',
        bio:               'Certified boiler technician, residential and commercial.',
      },
    },
    {
      id:                 '0197f8a0-0001-7000-8000-000000000003',
      username:           'nina.hadzic',
      email:              'nina.hadzic@a3service.ba',
      passwordHash:       '$2b$10$B2cTzNdYbkDCvRR7jrshW.5XdCm02mi1muL62ph5Ok2yLyYMGPpmu', // 'password123'
      role:               UserRole.TECHNICIAN,
      languagePreference: 'bs',
      profile: {
        specialization:    'Preventive Maintenance',
        yearsExperience:   4,
        certificateNumber: 'BA-TECH-2021-0089',
        bio:               'Specialist in scheduled maintenance and fault diagnostics.',
      },
    },
  ],

  clients: [
    {
      id:    '0197f8a0-0002-7000-8000-000000000001',
      name:  'Termograd d.o.o.',
      email: 'kontakt@termograd.ba',
      phone: '+38761100200',
      sites: [
        {
          id:                 '0197f8a0-0003-7000-8000-000000000001',
          rawAddress:         'Dr. Mustafe Pintola 2, 71210 Ilidža, Sarajevo',
          latitude:           43.8293,
          longitude:          18.3068,
          accessInstructions: 'Kod portira na ulazu, pitati za tehničku sobu B2.',
        },
      ],
    },
    {
      id:    '0197f8a0-0002-7000-8000-000000000002',
      name:  'Toplane Sarajevo d.o.o.',
      email: 'servis@toplane-sarajevo.ba',
      phone: '+38733222333',
      sites: [
        {
          id:                 '0197f8a0-0003-7000-8000-000000000002',
          rawAddress:         'Džemala Bijedića 114, 71000 Sarajevo',
          latitude:           43.8475,
          longitude:          18.3582,
          accessInstructions: 'Prijaviti se na recepciji, pratiti oznake prema kotlarnici.',
        },
        {
          id:                 '0197f8a0-0003-7000-8000-000000000003',
          rawAddress:         'Zmaja od Bosne 3, 71000 Sarajevo',
          latitude:           43.8550,
          longitude:          18.3960,
          accessInstructions: null,
        },
      ],
    },
  ],

  jobs: [
    {
      id:                '0197f8a0-0004-7000-8000-000000000001',
      siteId:            '0197f8a0-0003-7000-8000-000000000001',
      technicianId:      '0197f8a0-0001-7000-8000-000000000002',
      managerId:         '0197f8a0-0001-7000-8000-000000000001',
      rawAddress:        'Dr. Mustafe Pintola 2, 71210 Ilidža, Sarajevo',
      scheduledDate:     new Date('2026-05-06T08:00:00.000Z'),
      status:            JobStatus.PENDING,
      priority:          JobPriority.ROUTINE,
      estimatedDuration: 120,
      notes:             'Godišnji servis kotla — provjera filtera i brener.',
    },
    {
      id:                '0197f8a0-0004-7000-8000-000000000002',
      siteId:            '0197f8a0-0003-7000-8000-000000000002',
      technicianId:      '0197f8a0-0001-7000-8000-000000000002',
      managerId:         '0197f8a0-0001-7000-8000-000000000001',
      rawAddress:        'Džemala Bijedića 114, 71000 Sarajevo',
      scheduledDate:     new Date('2026-05-07T09:00:00.000Z'),
      status:            JobStatus.IN_PROGRESS,
      priority:          JobPriority.URGENT,
      estimatedDuration: 240,
      actualStartTime:   new Date('2026-05-07T09:12:00.000Z'),
      notes:             'Kvar na ekspanzijskoj posudi — hitna intervencija.',
    },
    {
      id:                '0197f8a0-0004-7000-8000-000000000003',
      siteId:            '0197f8a0-0003-7000-8000-000000000003',
      technicianId:      '0197f8a0-0001-7000-8000-000000000003',
      managerId:         '0197f8a0-0001-7000-8000-000000000001',
      rawAddress:        'Zmaja od Bosne 3, 71000 Sarajevo',
      scheduledDate:     new Date('2026-05-08T10:00:00.000Z'),
      status:            JobStatus.PENDING,
      priority:          JobPriority.MAINTENANCE,
      estimatedDuration: 90,
      notes:             'Redovni pregled — čišćenje izmjenjivača topline.',
    },
    {
      id:                '0197f8a0-0004-7000-8000-000000000004',
      siteId:            '0197f8a0-0003-7000-8000-000000000001',
      technicianId:      '0197f8a0-0001-7000-8000-000000000003',
      managerId:         '0197f8a0-0001-7000-8000-000000000001',
      rawAddress:        'Dr. Mustafe Pintola 2, 71210 Ilidža, Sarajevo',
      scheduledDate:     new Date('2026-04-28T08:00:00.000Z'),
      status:            JobStatus.COMPLETED,
      priority:          JobPriority.ROUTINE,
      estimatedDuration: 60,
      actualStartTime:   new Date('2026-04-28T08:05:00.000Z'),
      actualEndTime:     new Date('2026-04-28T09:10:00.000Z'),
      notes:             'Zamjena filtera — završeno bez problema.',
    },
  ],

  serviceLogs: [
    {
      id:    '0197f8a0-0005-7000-8000-000000000001',
      jobId: '0197f8a0-0004-7000-8000-000000000004',
    },
  ],

  syncLogs: [
    {
      id:             '0197f8a0-0006-7000-8000-000000000001',
      idempotencyKey: 'seed-sync-1',
      action:         SyncAction.UPLOAD,
      affectedEntity: 'Job',
      affectedId:     '0197f8a0-0004-7000-8000-000000000004',
      result:         SyncResult.SUCCESS,
      jobId:          '0197f8a0-0004-7000-8000-000000000004',
    },
    {
      id:              '0197f8a0-0006-7000-8000-000000000002',
      idempotencyKey:  'seed-sync-2',
      action:          SyncAction.UPLOAD,
      affectedEntity:  'Job',
      affectedId:      '0197f8a0-0004-7000-8000-000000000002',
      result:          SyncResult.FAIL,
      conflictDetails: { reason: 'Network timeout during field sync', retryable: true },
      jobId:           '0197f8a0-0004-7000-8000-000000000002',
    },
  ],

  // ── Library ──────────────────────────────────────────────

  parts: [
    {
      id:              '0197f8a0-0010-7000-8000-000000000001',
      sku:             'VIT-EXP-6L',
      name:            'Ekspanzijska posuda 6L',
      brand:           'Viadrus',
      unitPrice:       42.50,
      aliases:         ['expansion vessel 6L', 'ekspanzijska posuda'],
      inventoryStatus: 'IN_STOCK',
    },
    {
      id:              '0197f8a0-0010-7000-8000-000000000002',
      sku:             'VIT-PUMP-25-60',
      name:            'Cirkulaciona pumpa 25-60',
      brand:           'Viadrus',
      unitPrice:       118.00,
      aliases:         ['circulation pump', 'pumpa'],
      inventoryStatus: 'IN_STOCK',
    },
    {
      id:              '0197f8a0-0010-7000-8000-000000000003',
      sku:             'BAX-FILT-3/4',
      name:            'Filter za vodu 3/4"',
      brand:           'Baxi',
      unitPrice:       18.90,
      aliases:         ['water filter', 'filter'],
      inventoryStatus: 'IN_STOCK',
    },
    {
      id:              '0197f8a0-0010-7000-8000-000000000004',
      sku:             'BAX-ELKT-HEAT',
      name:            'Grijač kalkulatora ionizatora',
      brand:           'Baxi',
      unitPrice:       27.00,
      aliases:         ['ionisation electrode', 'elektroda'],
      inventoryStatus: 'LOW_STOCK',
    },
  ],

  boilerModels: [
    {
      id:                  '0197f8a0-0011-7000-8000-000000000001',
      manufacturerId:      'Viadrus',
      modelName:           'Hercules U22',
      series:              'Hercules',
      fuelType:            'gas',
      productionStartYear: 2015,
      documentType:        'Service Manual',
      language:            'bs',
      searchTerms:         ['viadrus', 'hercules', 'u22', 'plin', 'gas'],
      partIds:             [
        '0197f8a0-0010-7000-8000-000000000001',
        '0197f8a0-0010-7000-8000-000000000002',
      ],
      faultCodes: [
        {
          code:              'E01',
          description:       'Greška paljenja — kotao nije uspio upaliti plamen',
          possibleCauses:    ['Zatvoren plinski ventil', 'Istrošena elektroda za paljenje', 'Nizak pritisak plina'],
          manufacturerSteps: [
            { step: 1, instruction: 'Provjerite da li je plinski ventil otvoren' },
            { step: 2, instruction: 'Izmjerite pritisak plina na ulazu (min. 17 mbar)' },
            { step: 3, instruction: 'Očistite ili zamijenite elektrodu za paljenje' },
          ],
          cautionsOrNotes:   ['Uvijek isključite napajanje prije servisa elektrodnog sistema'],
          symptoms:          ['Kotao se resetuje nakon 3 pokušaja paljenja', 'Nema plamena'],
          relatedComponents: ['elektroda za paljenje', 'plinski ventil', 'regulator pritiska'],
          severity:          'HIGH',
          safetyLevel:       'CAUTION',
          searchTags:        ['paljenje', 'ignition', 'plamen', 'E01'],
          confidence:        0.95,
          reviewRequired:    false,
        },
        {
          code:              'E03',
          description:       'Pregrijavanje primarnog izmjenjivača topline',
          possibleCauses:    ['Nizak pritisak vode u sistemu', 'Začepljen filter', 'Pokvarena cirkulaciona pumpa'],
          manufacturerSteps: [
            { step: 1, instruction: 'Provjerite pritisak vode — mora biti između 1.0 i 1.5 bar' },
            { step: 2, instruction: 'Ispustite i dopunite sistem ako je pritisak ispod 0.8 bar' },
            { step: 3, instruction: 'Provjerite i očistite filter na povratnom vodu' },
          ],
          cautionsOrNotes:   ['Ne pokušavajte servisirati dok je kotao vrući'],
          symptoms:          ['Kotao se gasi na visokoj temperaturi', 'Alarm pregrijavanja'],
          relatedComponents: ['izmjenjivač topline', 'cirkulaciona pumpa', 'filter vode'],
          severity:          'HIGH',
          safetyLevel:       'WARNING',
          searchTags:        ['pregrijavanje', 'overheat', 'E03', 'temperatura'],
          confidence:        0.92,
          reviewRequired:    false,
        },
      ],
      technicalSpecs: [
        { parameter: 'Nazivna snaga',            value: '24',    unit: 'kW',   category: 'performance' },
        { parameter: 'Min. radni pritisak vode', value: '0.8',   unit: 'bar',  category: 'hydraulics'  },
        { parameter: 'Max. radni pritisak vode', value: '3.0',   unit: 'bar',  category: 'hydraulics'  },
        { parameter: 'Pritisak plina (G20)',     value: '20',    unit: 'mbar', category: 'gas'         },
        { parameter: 'Temperatura polaznog voda',value: '80',    unit: '°C',   category: 'temperature' },
      ],
      statusCodes: [
        { code: 'S01', description: 'Normalan rad — grijanje aktivno',  meaning: 'Kotao grije normalno' },
        { code: 'S02', description: 'Priprema tople sanitarne vode',     meaning: 'DHW mod aktivan'       },
        { code: 'S00', description: 'Kotao u stanju mirovanja (standby)', meaning: 'Nema zahtjeva za toplinom' },
      ],
      diagnosticCodes: [
        { code: 'D12', description: 'Senzor NTC povratnog voda — vrijednost van opsega', level: 'WARNING' },
        { code: 'D20', description: 'Komunikacijska greška modula za upravljanje',        level: 'ERROR'   },
      ],
      safetyWarnings: [
        { warningType: 'GAS_LEAK',     description: 'U slučaju mirisa plina odmah zatvorite plinski ventil i prozračite prostoriju. Ne koristite električne prekidače.' },
        { warningType: 'BURN_HAZARD',  description: 'Površine kotla mogu biti vrele tokom rada i nakon isključivanja. Koristite zaštitne rukavice.' },
      ],
      maintenanceTasks: [
        {
          task:     'Godišnji servis plamenika',
          interval: '12 months',
          steps:    ['Isključiti napajanje i gas', 'Demontirati plameničku komoru', 'Očistiti sapnice i brener četkicom', 'Provjeriti brtve i zamijeniti ako su oštećene', 'Montirati i testirati paljenje'],
        },
        {
          task:     'Provjera i čišćenje filtera vode',
          interval: '6 months',
          steps:    ['Zatvoriti ventile napajanja vode', 'Skinuti filter čep', 'Isprati i reinstalirati filter', 'Otvoriti ventile i provjeriti curenje'],
        },
      ],
    },
    {
      id:                  '0197f8a0-0011-7000-8000-000000000002',
      manufacturerId:      'Baxi',
      modelName:           'ECO5 Compact 24 Fi',
      series:              'ECO5',
      fuelType:            'gas',
      productionStartYear: 2018,
      documentType:        'Installation Manual',
      language:            'bs',
      searchTerms:         ['baxi', 'eco5', 'compact', '24fi', 'kondenzacijski'],
      partIds:             [
        '0197f8a0-0010-7000-8000-000000000003',
        '0197f8a0-0010-7000-8000-000000000004',
      ],
      faultCodes: [
        {
          code:              'E119',
          description:       'Nizak pritisak vode — sistem ne može cirkulisati',
          possibleCauses:    ['Curenje vode u sistemu', 'Zatvoreni radiatorski ventili', 'Istrošena ekspanzijska posuda'],
          manufacturerSteps: [
            { step: 1, instruction: 'Provjerite pritisak manometrom na prednjem panelu (min. 1 bar)' },
            { step: 2, instruction: 'Dopunite sistem vodom preko punjačkog ventila dok ne dostignete 1.2 bar' },
            { step: 3, instruction: 'Pregledajte ekspanzijsku posudu — pritisak mora biti 0.75 bar bez vode u sistemu' },
          ],
          cautionsOrNotes:   ['Redovito punjenje može ukazivati na curenje — pronađite i otklonite uzrok'],
          symptoms:          ['Kotao se isključuje', 'Manometar pokazuje ispod 0.8 bar'],
          relatedComponents: ['ekspanzijska posuda', 'punjački ventil', 'manometar'],
          severity:          'MEDIUM',
          safetyLevel:       'INFO',
          searchTags:        ['pritisak', 'pressure', 'E119', 'voda'],
          confidence:        0.98,
          reviewRequired:    false,
        },
        {
          code:              'E133',
          description:       'Greška ionizacije — plamen detektovan ali signal slab',
          possibleCauses:    ['Prljava ili istrošena elektroda za ionizaciju', 'Loša zemlja kotla', 'Poremećaj u opskrbi gasom'],
          manufacturerSteps: [
            { step: 1, instruction: 'Isključiti kotao i pričekati 5 minuta za hlađenje' },
            { step: 2, instruction: 'Demontirati elektrodu i vizuelno pregledati' },
            { step: 3, instruction: 'Ako je elektroda crna ili oštećena, zamijeniti (dio: BAX-ELKT-HEAT)' },
            { step: 4, instruction: 'Provjeriti kabelski priključak elektrode na PCB ploči' },
          ],
          cautionsOrNotes:   ['Uvijek koristite originalne Baxi elektrode — alternativni dijelovi mogu uzrokovati stalnu grešku'],
          symptoms:          ['Plamen se pali ali se odmah gasi', 'Kotao blokira nakon 2-3 pokušaja'],
          relatedComponents: ['ionizacijska elektroda', 'PCB kontrolna ploča', 'plinski ventil'],
          severity:          'MEDIUM',
          safetyLevel:       'CAUTION',
          searchTags:        ['ionizacija', 'ionisation', 'E133', 'elektroda'],
          confidence:        0.90,
          reviewRequired:    false,
        },
      ],
      technicalSpecs: [
        { parameter: 'Nazivna snaga',             value: '24',  unit: 'kW',   category: 'performance'  },
        { parameter: 'Efikasnost (kondenzacija)', value: '109', unit: '%',    category: 'performance'  },
        { parameter: 'Min. radni pritisak vode',  value: '0.5', unit: 'bar',  category: 'hydraulics'   },
        { parameter: 'Max. temperatura polaza',   value: '85',  unit: '°C',   category: 'temperature'  },
        { parameter: 'Pritisak plina (G20)',      value: '20',  unit: 'mbar', category: 'gas'          },
      ],
      statusCodes: [
        { code: '0',   description: 'Standby — nema zahtjeva',             meaning: 'Kotao čeka signal termostata' },
        { code: '1',   description: 'Grijanje prostora aktivno (CH mod)',    meaning: 'Normalan rad'                 },
        { code: '3',   description: 'Priprema sanitarne vode (DHW mod)',     meaning: 'Bojler se grije'              },
        { code: '8',   description: 'Pumpni postrun — hlađenje izmjenjivača', meaning: 'Automatsko hlađenje'         },
      ],
      diagnosticCodes: [
        { code: 'D01', description: 'NTC senzor polaznog voda — kratki spoj',    level: 'ERROR'   },
        { code: 'D02', description: 'NTC senzor povratnog voda — kratki spoj',   level: 'ERROR'   },
        { code: 'D10', description: 'Pritisak plina ispod minimalne vrijednosti', level: 'WARNING' },
      ],
      safetyWarnings: [
        { warningType: 'GAS_LEAK',         description: 'Ako osjetite miris plina ne koristite električne uređaje, ne palite vatru, odmah pozovite servis.' },
        { warningType: 'ELECTRICAL',       description: 'Kotao mora biti uzemljen sukladno lokalnim propisima. Rad na kotlu bez isključenog napajanja je zabranjem.' },
        { warningType: 'CONDENSATE_DRAIN', description: 'Kondenzatna cijev mora biti prikladno odvedena — blokada može uzrokovati oštećenje kotla.' },
      ],
      maintenanceTasks: [
        {
          task:     'Godišnji servis kondenzatne posude',
          interval: '12 months',
          steps:    ['Isključiti kotao', 'Otvoriti dno kondenzatne posude', 'Isprazniti i isprati posude', 'Provjeriti silikonsku brtvu', 'Zatvoriti i testirati nepropusnost'],
        },
        {
          task:     'Servis ionizacijske elektrode',
          interval: '24 months',
          steps:    ['Isključiti struju', 'Demontirati plameničku glavu', 'Skinuti elektrodu', 'Čišćenje finim brusnim papirom (P400)', 'Montirati i provjeriti razmak (3-4mm)'],
        },
      ],
    },
  ],

  warranties: [
    {
      id:             '0197f8a0-0012-7000-8000-000000000001',
      boilerModelId:  '0197f8a0-0011-7000-8000-000000000001',  // Viadrus Hercules U22
      jobId:          '0197f8a0-0004-7000-8000-000000000004',  // Completed job
      startDate:      new Date('2026-04-28T09:10:00.000Z'),    // Matches job actualEndTime
      durationMonths: 24,
      expiresAt:      new Date('2028-04-28T09:10:00.000Z'),
      status:         WarrantyStatus.ACTIVE,
      notes:          'Garancija 2 godine — zamjena filtera i provjera ekspanzijske posude.',
    },
  ],
} as const;

// ─────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Users + Profiles
  for (const { profile, ...userData } of SEED.users) {
    await prisma.user.upsert({
      where:  { id: userData.id },
      update: { passwordHash: userData.passwordHash },
      create: {
        ...userData,
        profile: { create: profile },
      },
    });
  }
  console.log(`✔ Users (${SEED.users.length})`);

  // 2. Clients + Sites
  for (const { sites, ...clientData } of SEED.clients) {
    await prisma.client.upsert({
      where:  { id: clientData.id },
      update: {},
      create: clientData,
    });

    for (const siteData of sites) {
      await prisma.site.upsert({
        where:  { id: siteData.id },
        update: {},
        create: { ...siteData, clientId: clientData.id },
      });
    }
  }
  console.log(`✔ Clients (${SEED.clients.length}) + Sites`);

  // 3. Jobs
  for (const jobData of SEED.jobs) {
    await prisma.job.upsert({
      where:  { id: jobData.id },
      update: {},
      create: jobData,
    });
  }
  console.log(`✔ Jobs (${SEED.jobs.length})`);

  // 4. ServiceLogs
  for (const logData of SEED.serviceLogs) {
    await prisma.serviceLog.upsert({
      where:  { id: logData.id },
      update: {},
      create: logData,
    });
  }
  console.log(`✔ ServiceLogs (${SEED.serviceLogs.length})`);

  // 5. SyncLogs
  for (const syncData of SEED.syncLogs) {
    await prisma.syncLog.upsert({
      where:  { id: syncData.id },
      update: {},
      create: syncData,
    });
  }
  console.log(`✔ SyncLogs (${SEED.syncLogs.length})`);

  // 6. Parts
  for (const partData of SEED.parts) {
    const { unitPrice, ...rest } = partData;
    await prisma.part.upsert({
      where:  { sku: rest.sku },
      update: {},
      create: { ...rest, unitPrice: unitPrice },
    });
  }
  console.log(`✔ Parts (${SEED.parts.length})`);

  // 7. BoilerModels + related data + ModelParts
  for (const { partIds, faultCodes, technicalSpecs, statusCodes, diagnosticCodes, safetyWarnings, maintenanceTasks, searchTerms, ...modelData } of SEED.boilerModels) {
    const existing = await prisma.boilerModel.findUnique({ where: { id: modelData.id } });
    const model = existing ?? await prisma.boilerModel.create({
      data: { ...modelData, searchTerms: searchTerms as string[] },
    });

    if (!existing) {
      if (faultCodes.length) {
        await prisma.faultCode.createMany({
          data: faultCodes.map(f => ({ ...f, modelId: model.id })),
        });
      }
      if (technicalSpecs.length) {
        await prisma.technicalSpec.createMany({
          data: technicalSpecs.map(s => ({ ...s, appliesToModels: [], confidence: 0.95, reviewRequired: false, modelId: model.id })),
        });
      }
      if (statusCodes.length) {
        await prisma.statusCode.createMany({
          data: statusCodes.map(s => ({ ...s, modelId: model.id })),
        });
      }
      if (diagnosticCodes.length) {
        await prisma.diagnosticCode.createMany({
          data: diagnosticCodes.map(d => ({ ...d, modelId: model.id })),
        });
      }
      if (safetyWarnings.length) {
        await prisma.safetyWarning.createMany({
          data: safetyWarnings.map(w => ({ ...w, modelId: model.id })),
        });
      }
      if (maintenanceTasks.length) {
        await prisma.maintenanceTask.createMany({
          data: maintenanceTasks.map(t => ({ ...t, modelId: model.id })),
        });
      }
      for (const partId of partIds) {
        await prisma.modelPart.upsert({
          where:  { modelId_partId: { modelId: model.id, partId } },
          update: {},
          create: { modelId: model.id, partId },
        });
      }
    }
  }
  console.log(`✔ BoilerModels (${SEED.boilerModels.length}) + FaultCodes, TechnicalSpecs, StatusCodes, DiagnosticCodes, SafetyWarnings, MaintenanceTasks, ModelParts`);

  // 8. Warranties
  for (const warrantyData of SEED.warranties) {
    await prisma.warranty.upsert({
      where:  { id: warrantyData.id },
      update: {},
      create: warrantyData,
    });
  }
  console.log(`✔ Warranties (${SEED.warranties.length})`);

  console.log('✅ Seed complete.');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });