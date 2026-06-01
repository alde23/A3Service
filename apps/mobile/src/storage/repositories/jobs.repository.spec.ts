import {
  mapApiJobStatusToLocal,
  mapLocalJobStatusToApi,
  ensureJobsSeeded,
  upsertJobsFromServer,
  createJob,
  updateJobStatus,
  findJobByRemoteId,
  setJobRemoteIdInCurrentWriter,
} from './jobs.repository';
import { database } from '../index';
import Job from '../models/Job';

describe('jobs.repository', () => {
  beforeEach(async () => {
    await database.write(async () => {
      await database.get('jobs').query().destroyAllPermanently();
      await database.get('sync_queue').query().destroyAllPermanently();
    });
  });

  describe('mappers', () => {
    it('maps API to local', () => {
      expect(mapApiJobStatusToLocal('IN_PROGRESS')).toBe('in-progress');
      expect(mapApiJobStatusToLocal('COMPLETED')).toBe('completed');
      expect(mapApiJobStatusToLocal('CANCELLED')).toBe('cancelled');
      expect(mapApiJobStatusToLocal('PENDING')).toBe('not-started');
      expect(mapApiJobStatusToLocal(null)).toBe('not-started');
      expect(mapApiJobStatusToLocal('UNKNOWN')).toBe('not-started');
    });

    it('maps local to API', () => {
      expect(mapLocalJobStatusToApi('in-progress')).toBe('IN_PROGRESS');
      expect(mapLocalJobStatusToApi('completed')).toBe('COMPLETED');
      expect(mapLocalJobStatusToApi('cancelled')).toBe('CANCELLED');
      expect(mapLocalJobStatusToApi('not-started')).toBe('PENDING');
    });
  });

  describe('ensureJobsSeeded', () => {
    it('seeds jobs only if empty', async () => {
      await ensureJobsSeeded();
      const count1 = await database.get('jobs').query().fetchCount();
      expect(count1).toBe(3);

      await ensureJobsSeeded();
      const count2 = await database.get('jobs').query().fetchCount();
      expect(count2).toBe(3); // no change
    });
  });

  describe('upsertJobsFromServer', () => {
    it('upserts jobs successfully', async () => {
      const changed = await upsertJobsFromServer([
        {
          id: 'remote-1',
          siteId: 'site-1',
          scheduledDate: new Date().toISOString(),
          estimatedDuration: 120,
          status: 'PENDING',
          rawAddress: '123 Main St',
        },
      ]);

      expect(changed).toBe(1);
      let jobs = await database.get<Job>('jobs').query().fetch();
      expect(jobs.length).toBe(1);
      expect(jobs[0].title).toBe('123 Main St');
      expect(jobs[0].durationMinutes).toBe(120);

      // Upsert existing
      const changed2 = await upsertJobsFromServer([
        {
          id: 'remote-1',
          siteId: 'site-1',
          scheduledDate: new Date().toISOString(),
          estimatedDuration: 60,
          status: 'COMPLETED',
          rawAddress: '123 Main St Update',
        },
      ]);
      expect(changed2).toBe(1);
      jobs = await database.get<Job>('jobs').query().fetch();
      expect(jobs.length).toBe(1);
      expect(jobs[0].title).toBe('123 Main St Update');
      expect(jobs[0].status).toBe('completed');
    });
  });

  describe('createJob', () => {
    it('creates job and queues insert sync operation', async () => {
      await createJob({
        title: 'New Job',
        scheduledAt: new Date(),
        durationMinutes: 45,
        technicianId: 't1',
        clientId: 'client-local',
      });

      const jobs = await database.get<Job>('jobs').query().fetch();
      expect(jobs.length).toBe(1);
      expect(jobs[0].title).toBe('New Job');

      const queue = await database.get('sync_queue').query().fetch();
      expect(queue.length).toBe(1);
      const q = queue[0] as any;
      expect(q.tableName).toBe('jobs');
      expect(q.operation).toBe('INSERT');
    });
  });

  describe('updateJobStatus', () => {
    it('updates status and queues sync operation', async () => {
      await createJob({
        title: 'New Job',
        scheduledAt: new Date(),
        durationMinutes: 45,
        technicianId: 't1',
        clientId: 'client-local',
      });

      const jobs = await database.get<Job>('jobs').query().fetch();
      const job = jobs[0];

      await updateJobStatus(job.id, 'completed');

      const updated = await database.get<Job>('jobs').find(job.id);
      expect(updated.status).toBe('completed');

      const queue = await database.get('sync_queue').query().fetch();
      // createJob queued 1, updateJobStatus queued 1
      expect(queue.length).toBe(2);
      expect((queue[1] as any).operation).toBe('INSERT'); // because no remote ID yet
    });

    it('queues UPDATE sync operation if remote ID exists', async () => {
      await createJob({
        title: 'New Job',
        scheduledAt: new Date(),
        durationMinutes: 45,
        technicianId: 't1',
        clientId: 'client-local',
      });

      const jobs = await database.get<Job>('jobs').query().fetch();
      const job = jobs[0];

      await database.write(async () => {
        await setJobRemoteIdInCurrentWriter(job.id, 'rem-id');
      });

      await updateJobStatus(job.id, 'completed');
      
      const queue = await database.get('sync_queue').query().fetch();
      expect((queue[1] as any).operation).toBe('UPDATE');
    });
  });

  describe('findJobByRemoteId', () => {
    it('returns null if not found', async () => {
      const job = await findJobByRemoteId('non-existent');
      expect(job).toBeNull();
    });
  });
});
