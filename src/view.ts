export class AppView {
    private rootElement: HTMLElement;

    constructor(rootElementId: string) {
        const root = document.getElementById(rootElementId);
        if (!root) {
            throw new Error(`Element with ID '${rootElementId}' not found.`);
        }
        this.rootElement = root;
    }

    // Render the data to the UI
    render(data: any): void {
        this.rootElement.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    }

    // Render a list of registered components
    renderComponents(components: Map<string, any>): void {
        const componentList = Array.from(components.keys())
            .map(name => `<li>${name}</li>`)
            .join('');
        this.rootElement.innerHTML = `<h2>Registered Components</h2><ul>${componentList}</ul>`;
    }

    // Render the status of a specific component
    renderComponentStatus(name: string, status: any): void {
        this.rootElement.innerHTML = `<h2>Status of '${name}'</h2><p>${status}</p>`;
    }

    // Render available actions for a specific component
    renderComponentActions(name: string, actions: string[]): void {
        const actionList = actions
            .map(action => `<li>${action}</li>`)
            .join('');
        this.rootElement.innerHTML = `<h2>Actions for '${name}'</h2><ul>${actionList}</ul>`;
    }
}
