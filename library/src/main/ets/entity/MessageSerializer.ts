import { CallMessage } from './CallMessage';
import { ResponseMessage } from './ResponseMessage';

export class MessageSerializer {
  static serializeCallMessage(message: CallMessage): string {
    return JSON.stringify(message);
  }

  static serializeResponseMessage(message: ResponseMessage): string {
    return JSON.stringify(message);
  }
}
