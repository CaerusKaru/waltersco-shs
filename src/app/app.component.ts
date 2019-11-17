import {Component} from '@angular/core';
import {tap} from 'rxjs/operators';

import {Monitor, MonitorService} from './monitor.service';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  monitors: Monitor[] = [];
  regions: string[] = [];
  apps: string[] = [];
  status$ = this.monitorService.getStatus()
    .pipe(tap((monitors: Monitor[]) => {
      this.regions = Array.from(new Set(monitors.map(m => m.region)));
      this.apps = Array.from(new Set(monitors.map(m => m.app)));
      this.monitors = monitors;
    }));

  constructor(private monitorService: MonitorService) {
  }

  getStatus(region: string, app: string): 'red' | 'green' | undefined {
    const monitor = this.monitors.find(v => v.region === region && v.app === app);
    return monitor ? monitor.status : undefined;
  }
}
