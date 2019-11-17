import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, timer} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {environment} from '../environments/environment';


export interface Monitor {
  monitorId: string;
  app: string;
  region: string;
  endpoint: string;
  status: 'red' | 'green';
}

@Injectable({
  providedIn: 'root'
})
export class MonitorService {
  private API = environment.api;

  constructor(private httpClient: HttpClient) {
  }

  getStatus(): Observable<Monitor[]> {
    if (environment.production) {
      return timer(1, 60000).pipe(switchMap(() => this.httpClient.get<Monitor[]>(`${this.API}/status`)));
    } else {
      return timer(1, 60000).pipe(map(() =>
        Array.from({length: LENGTH}, (_, i) => ({
          monitorId: i + '',
          app: SERVICES[Math.floor(i / REGIONS.length)],
          region: REGIONS[i % REGIONS.length],
          endpoint: `endpoint_${i}`,
          status: Math.random() > 0.5 ? 'red' : 'green',
        }))
      ));
    }
  }
}

const SERVICES = ['A', 'B', 'C', 'D', 'E'];
const REGIONS = ['NA', 'EU', 'AP'];
const LENGTH = SERVICES.length * REGIONS.length;
