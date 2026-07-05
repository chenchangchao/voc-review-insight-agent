declare module "nodemailer" {
  type SendMailResult = {
    messageId?: string;
    accepted?: string[];
    rejected?: string[];
  };

  type Transporter = {
    sendMail(options: {
      from: string;
      to: string[];
      subject: string;
      text: string;
      html: string;
      attachments?: Array<{
        filename: string;
        content: string;
        contentType: string;
      }>;
    }): Promise<SendMailResult>;
  };

  type TransportOptions = {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };

  const nodemailer: {
    createTransport(options: TransportOptions): Transporter;
  };

  export default nodemailer;
}
