import { Injectable, NotImplementedException } from '@nestjs/common';

@Injectable()
export class GeoCodingService {
  travelMatrix() {
    // TODO(scheduling): implement with real travel-time matrix provider.
    throw new NotImplementedException('Geo coding travel matrix is not implemented');
  }
}
