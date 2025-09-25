import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
    private stripe: Stripe;

    constructor(private configService: ConfigService) {
        this.stripe = new Stripe(this.configService.getOrThrow('STRIPE_SECRET_KEY'));
    }

    async createPaymentIntent(
        amount: number,
        currency: string = 'usd',
        email?: string,
        metadata?: Record<string, any>,
    ) {
        try {
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: Math.round(amount * 100),
                currency,
                payment_method_types: ['card', 'us_bank_account', 'crypto', 'cashapp', 'link'],
                metadata: {
                    email: email || '',
                    ...metadata,
                },
                receipt_email: email,
            });

            return {
                client_secret: paymentIntent.client_secret,
                payment_intent_id: paymentIntent.id,
            };
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }


    async retrievePaymentIntent(paymentIntentId: string) {
        try {
            const paymentIntent = await this.stripe.paymentIntents.retrieve(
                paymentIntentId,
            );
            return paymentIntent;
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }

    async handleWebhook(signature: string, payload: any) {
        console.log(payload)
        const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');

        let event: Stripe.Event;

        try {
            event = this.stripe.webhooks.constructEvent(
                payload,
                signature,
                webhookSecret,
            );
        } catch (error) {
            throw new BadRequestException(`Webhook Error: ${error.message}`);
        }

        // Handle the event
        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                await this.handlePaymentSuccess(paymentIntent);
                break;
            case 'payment_intent.payment_failed':
                const failedPayment = event.data.object as Stripe.PaymentIntent;
                await this.handlePaymentFailure(failedPayment);
                break;
            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        return { received: true };
    }

    private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
        // Log success, update database, send confirmation email, etc.
        console.log('Payment successful:', paymentIntent.id);
        console.log('Customer email:', paymentIntent.metadata.email);

        // Here you would typically:
        // 1. Update your database to mark the order as paid
        // 2. Send a confirmation email
        // 3. Trigger any other business logic
    }

    private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
        // Handle failed payment
        console.log('Payment failed:', paymentIntent.id);
    }

    async confirmPaymentStatus(paymentIntentId: string) {
        try {
            const paymentIntent = await this.stripe.paymentIntents.retrieve(
                paymentIntentId,
            );

            return {
                status: paymentIntent.status,
                amount: paymentIntent.amount / 100,
                currency: paymentIntent.currency,
                email: paymentIntent.metadata?.email || paymentIntent.receipt_email,
                created: new Date(paymentIntent.created * 1000),
            };
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }
}