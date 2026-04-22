import { describe, expect, it } from 'vitest';

import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  it('should return the API hello message', () => {
    const controller = new AppController(new AppService());
    expect(controller.getData()).toEqual({ message: 'Hello API' });
  });
});
