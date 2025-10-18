import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ErrorTrackerService } from '../tracker.service';

@Injectable()
export class ErrorTrackerInterceptor implements NestInterceptor {
  constructor(private readonly errorTracker: ErrorTrackerService) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, headers } = request;

    const requestMetadata = {
      method,
      url,
      ip,
      userAgent: headers?.['user-agent'],
    };

    return next.handle().pipe(
      tap(() => {
        this.errorTracker.event('Request completed', 'INFO', requestMetadata);
      }),
      catchError((error: Error | HttpException) => {
        const isHttpException = error instanceof HttpException;
        const level = isHttpException ? 'WARNING' : 'ERROR';

        this.errorTracker.capture(error, level, {
          ...requestMetadata,
          statusCode: isHttpException ? error.getStatus() : 500,
        });

        return throwError(() => error);
      })
    );
  }
}
