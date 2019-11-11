import {Component, OnDestroy} from '@angular/core';
import {Subscription} from 'rxjs';

import {Monitor, MonitorService} from './monitor.service';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnDestroy {

  monitors: Monitor[] = [];
  regions: string[] = [];
  apps: string[] = [];
  private status$ = this.monitorService.getStatus();
  private subscription: Subscription;

  constructor(private monitorService: MonitorService) {
    const processMonitors = (monitors: Monitor[]) => {
      this.regions = Array.from(new Set(monitors.map(m => m.region)));
      this.apps = Array.from(new Set(monitors.map(m => m.app)));
      this.monitors = monitors;
    };
    this.subscription = this.status$.subscribe(processMonitors);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  getStatus(region: string, app: string): 'red' | 'green' | undefined {
    const monitor = this.monitors.find(v => v.region === region && v.app === app);
    return monitor ? monitor.status : undefined;
  }
}
