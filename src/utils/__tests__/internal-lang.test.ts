import { InternalLanguage } from '../internal-lang';

describe('InternalLanguage', () => {
    let lang: InternalLanguage;

    beforeEach(() => {
        lang = new InternalLanguage();
    });

    test('should define terms', async () => {
        const term = await lang.defineTerm('energy', 'base unit of work capacity');
        expect(term.type).toBe('term');
        expect(term.value).toBe('base unit of work capacity');
    });

    test('should postulate axioms', async () => {
        const result = await lang.postulateAxiom('energy is conserved');
        expect(result).toBe(true);
    });

    test('should prove theorems', async () => {
        const theorem = await lang.proveTheorem('conservation', [
            'given: closed system',
            'observe: energy measurements',
            'conclude: energy constant'
        ]);
        expect(theorem.children).toHaveLength(3);
    });

    test('should evaluate formulas', async () => {
        const context = new Map([['x', 5], ['y', 3]]);
        const result = await lang.evaluateFormula('x + y', context);
        expect(result).toBe(8);
    });
});
