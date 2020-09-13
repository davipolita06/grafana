import { Subject, Unsubscribable, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AppEvent } from '../types/appEvents';

/*
 * Base event type
 */
export abstract class BusEvent {
  readonly type: string;

  constructor() {
    //@ts-ignore
    this.type = this.__proto__.constructor.type;
  }
}

/*
 * Base event type with payload
 */
export abstract class BusEventWithPayload<T> extends BusEvent {
  readonly payload: T;

  constructor(payload: T) {
    super();
    this.payload = payload;
  }
}

/*
 * Interface for an event type constructor
 */
export interface BusEventType<T extends BusEvent> {
  type: string;
  new (...args: any[]): T;
}

/*
 * Event callback/handler type
 */
export interface BusEventHandler<T extends BusEvent> {
  (event: T): void;
}

/**
 * Main minimal interface
 */
export interface EventBus {
  /**
   * Emit single vent
   */
  $emit<T extends BusEvent>(event: T): void;

  /**
   * Subscribe to single event
   */
  $on<T extends BusEvent>(eventType: BusEventType<T>, handler: BusEventHandler<T>): Unsubscribable;
}

/**
 * Legacy functions
 */
export interface LegacyEmitter {
  /**
   * @deprecated use $emit
   */
  emit(name: string, data?: any): void;
  /**
   * @deprecated use $emit
   */
  emit<T extends undefined>(event: AppEvent<T>): void;
  /**
   * @deprecated use $emit
   */
  emit<T>(event: AppEvent<T>, payload: T): void;

  /**
   * @deprecated use $on
   */
  on(name: string, handler: (payload?: any) => void, scope?: any): void;
  /**
   * @deprecated use $on
   */
  on<T extends undefined>(event: AppEvent<T>, handler: () => void, scope?: any): void;
  /**
   * @deprecated use $on
   */
  on<T>(event: AppEvent<T>, handler: (payload: T) => void, scope?: any): void;
  /**
   * @deprecated use $on
   */
  on<T>(event: AppEvent<T> | string, handler: (payload?: T | any) => void, scope?: any): void;

  /**
   * @deprecated use $on
   */
  off(name: string, handler: (payload?: any) => void): void;
  /**
   * @deprecated use $on
   */
  off<T extends undefined>(event: AppEvent<T>, handler: () => void): void;
  /**
   * @deprecated use $on
   */
  off<T>(event: AppEvent<T>, handler: (payload: T) => void): void;
  /**
   * @deprecated use $on
   */
  off<T>(event: AppEvent<T> | string, handler: (payload?: T | any) => void): void;
}

export class EventBusSrv implements EventBus, LegacyEmitter {
  private eventStream: Subject<any>;

  constructor() {
    this.eventStream = new Subject();
  }

  $emit<T extends BusEvent>(event: T): void {
    this.eventStream.next(event);
  }

  $on<T extends BusEvent>(typeFilter: BusEventType<T>, handler: BusEventHandler<T>): Unsubscribable {
    return this.eventStream
      .pipe(
        filter(event => {
          return event.type === typeFilter.type;
        })
      )
      .subscribe({ next: handler });
  }

  /**
   * Legacy functions
   */
  emit(name: string, data?: any): void;
  emit<T extends undefined>(event: AppEvent<T>): void;
  emit<T>(event: AppEvent<T> | string, payload?: T | any): void {
    console.log(`Deprecated emitter function used (emit), use $emit`);

    if (typeof event === 'string') {
      this.eventStream.next({
        type: event,
        payload,
      });
    } else {
      this.eventStream.next({
        type: event.name,
        payload,
      });
    }
  }

  on(name: string, handler: (payload?: any) => void, scope?: any): void;
  on<T extends undefined>(event: AppEvent<T>, handler: () => void, scope?: any): void;
  on<T>(event: AppEvent<T>, handler: (payload: T) => void, scope?: any): void;
  on<T>(event: AppEvent<T> | string, handler: (payload?: T | any) => void, scope?: any) {
    console.log(`Deprecated emitter function used (on), use $on`);

    if (typeof event === 'string') {
      // this.emitter.on(event, handler);

      // if (scope) {
      //   const unbind = scope.$on('$destroy', () => {
      //     this.emitter.off(event, handler);
      //     unbind();
      //   });
      // }
      return;
    }

    this.eventStream
      .pipe(
        filter(streamEvent => {
          console.log('got event', event);
          return streamEvent.type === event.name;
        })
      )
      .subscribe({
        next: streamEvent => {
          handler(streamEvent.payload);
        },
      });

    // if (scope) {
    //   const unbind = scope.$on('$destroy', () => {
    //     this.emitter.off(event.name, handler);
    //     unbind();
    //   });
    // }
  }

  off(name: string, handler: (payload?: any) => void): void;
  off<T extends undefined>(event: AppEvent<T>, handler: () => void): void;
  off<T>(event: AppEvent<T>, handler: (payload: T) => void): void;
  off<T>(event: AppEvent<T> | string, handler: (payload?: T | any) => void) {
    if (typeof event === 'string') {
      this.emitter.off(event, handler);
      return;
    }

    this.emitter.off(event.name, handler);
  }
}

/**
 * Handles unsubscribing to all events subscribed through this group
 */
export class EventBusGroup implements EventBus {
  private groupSub?: Subscription;

  constructor(private bus: EventBus) {}

  $emit<T extends BusEvent>(event: T) {
    this.bus.$emit(event);
  }

  $on<T extends BusEvent>(typeFilter: BusEventType<T>, handler: BusEventHandler<T>): Unsubscribable {
    return this.addToGroupSub(this.bus.$on(typeFilter, handler));
  }

  private addToGroupSub(childSub: Unsubscribable): Unsubscribable {
    if (!this.groupSub) {
      this.groupSub = new Subscription();
    }

    return this.groupSub.add(childSub);
  }

  unsubscribe() {
    if (this.groupSub) {
      this.groupSub.unsubscribe();
    }
  }
}
