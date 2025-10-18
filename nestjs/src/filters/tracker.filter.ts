import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ErrorTrackerService } from '../tracker.service';

@Catch()
export class ErrorTrackerFilter implements ExceptionFilter {
  constructor(private readonly errorTracker: ErrorTrackerService) { }

  catch(exception: Error | HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const level = status >= 500 ? 'ERROR' : 'WARNING';

    this.errorTracker.capture(exception, level, {
      method: request.method,
      url: request.url,
      ip: request.ip,
      statusCode: status,
      userAgent: request.headers?.['user-agent'],
    });

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: isHttpException ? exception.message : 'Internal server error',
    });
  }
}
