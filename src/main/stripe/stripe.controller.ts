import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { StripeService } from './stripe.service';

interface CreatePaymentDto {
  amount: number;
  currency?: string;
  email: string;
  productName?: string;
  metadata?: Record<string, any>;
}

@Controller('payments')
export class StripeController {
  constructor(private readonly stripeService: StripeService) { }

  @Post('create-intent')
  async createPaymentIntent(@Body() createPaymentDto: CreatePaymentDto) {
    console.log("Hitting endpoint", createPaymentDto)
    const { amount, currency, email, productName, metadata } = createPaymentDto;

    const paymentData = await this.stripeService.createPaymentIntent(
      amount,
      currency || 'usd',
      email,
      {
        productName: productName || '',
        ...metadata,
      },
    );

    return paymentData;
  }

  @Get('status/:paymentIntentId')
  async getPaymentStatus(@Param('paymentIntentId') paymentIntentId: string) {
    return await this.stripeService.confirmPaymentStatus(paymentIntentId);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('stripe-signature') sig: string,
  ) {
    try {
      await this.stripeService.handleWebhook(sig, req?.body);
      res.status(200).send({ received: true });
    } catch (err) {
      console.error('Webhook error:', err);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }

  }
}