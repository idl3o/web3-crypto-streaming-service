import { JSDOM } from 'jsdom';
import { AppView } from './view';

describe('AppView', () => {
    let dom: JSDOM;
    let appView: AppView;

    beforeEach(() => {
        // Create a virtual DOM
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html lang="en">
            <head><title>Test</title></head>
            <body>
                <div id="app"></div>
            </body>
            </html>
        `);

        // Set up the global document and window
        global.document = dom.window.document;
        global.window = dom.window;

        // Initialize AppView
        appView = new AppView('app');
    });

    afterEach(() => {
        // Clean up the virtual DOM
        dom.window.close();
    });

    it('should render data to the UI', () => {
        const testData = { key: 'value' };
        appView.render(testData);

        const appElement = document.getElementById('app');
        expect(appElement?.innerHTML).toContain(JSON.stringify(testData, null, 2));
    });

    it('should render a list of registered components', () => {
        const components = new Map([
            ['Component1', {}],
            ['Component2', {}],
        ]);
        appView.renderComponents(components);

        const appElement = document.getElementById('app');
        expect(appElement?.innerHTML).toContain('<li>Component1</li>');
        expect(appElement?.innerHTML).toContain('<li>Component2</li>');
    });

    it('should render the status of a specific component', () => {
        appView.renderComponentStatus('TestComponent', 'Running');

        const appElement = document.getElementById('app');
        expect(appElement?.innerHTML).toContain("Status of 'TestComponent'");
        expect(appElement?.innerHTML).toContain('Running');
    });

    it('should render available actions for a specific component', () => {
        const actions = ['start', 'stop', 'restart'];
        appView.renderComponentActions('TestComponent', actions);

        const appElement = document.getElementById('app');
        expect(appElement?.innerHTML).toContain("Actions for 'TestComponent'");
        expect(appElement?.innerHTML).toContain('<li>start</li>');
        expect(appElement?.innerHTML).toContain('<li>stop</li>');
        expect(appElement?.innerHTML).toContain('<li>restart</li>');
    });
});
