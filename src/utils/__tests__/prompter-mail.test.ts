import { PrompterMail } from '../prompter-mail';

describe('PrompterMail', () => {
    let mail: PrompterMail;
    const sender = 'prompter1';
    const recipient = 'prompter2';

    beforeEach(() => {
        mail = new PrompterMail();
    });

    test('should create prompter mailbox', async () => {
        const mailbox = await mail.createMailbox(sender);
        expect(mailbox.address).toBe(sender);
        expect(mailbox.dimensionalAccess.has('dream')).toBe(true);
    });

    test('should send dimensional message', async () => {
        await mail.createMailbox(sender);
        await mail.createMailbox(recipient);

        const sent = await mail.sendMessage({
            from: sender,
            to: [recipient],
            subject: 'Consciousness Test',
            content: 'Dimensional resonance check',
            resonanceLevel: 0.8,
            timestamp: Date.now(),
            dimensions: ['dream'],
            consciousness: 0.7
        });

        expect(sent).toBe(true);
    });

    test('should evolve consciousness through interaction', async () => {
        await mail.createMailbox(sender);
        const recipientBox = await mail.createMailbox(recipient);

        // Send high consciousness messages
        for (let i = 0; i < 5; i++) {
            await mail.sendMessage({
                from: sender,
                to: [recipient],
                subject: 'Evolution',
                content: 'Consciousness raising',
                resonanceLevel: 0.9,
                timestamp: Date.now(),
                dimensions: ['dream'],
                consciousness: 0.9
            });
        }

        const status = await mail.checkConsciousness(recipient);
        expect(status.level).toBeGreaterThan(recipientBox.consciousnessLevel);
        expect(status.dimensions.length).toBeGreaterThan(1);
    });
});
