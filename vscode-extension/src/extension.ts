import * as vscode from 'vscode';
import { CryptoDataService } from '../../src/services/CryptoDataService';
import { PromptManager } from '../../src/prompts/PromptManager';

export function activate(context: vscode.ExtensionContext) {
    const service = new CryptoDataService({
        apiKey: 'development',
        enablePromptOptimization: true,
        enableVM: true
    });

    const promptManager = new PromptManager();
    let statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);

    // Register commands
    const disposables = [
        vscode.commands.registerCommand('cryptoCodex.optimize', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) return;

            const text = editor.document.getText(editor.selection);
            const optimized = await promptManager.createPrompt(text);
            editor.edit(builder => builder.replace(editor.selection, optimized));
        }),

        vscode.commands.registerCommand('cryptoCodex.analyze', async () => {
            const document = vscode.window.activeTextEditor?.document;
            if (!document) return;

            const text = document.getText();
            const panel = vscode.window.createWebviewPanel(
                'codeAnalysis',
                'Code Analysis',
                vscode.ViewColumn.Two,
                { enableScripts: true }
            );

            panel.webview.html = await generateAnalysisView(text, service);
        }),

        vscode.commands.registerCommand('cryptoCodex.startStream', async () => {
            const symbol = await vscode.window.showInputBox({
                prompt: 'Enter crypto symbol (e.g., btcusdt)'
            });
            if (!symbol) return;

            await service.subscribeToSymbol(symbol);
            updateStatusBar(`Monitoring ${symbol.toUpperCase()}`);
        })
    ];

    context.subscriptions.push(...disposables, statusBar);
    statusBar.show();
}

async function generateAnalysisView(code: string, service: CryptoDataService): Promise<string> {
    const stats = await service.getPromptStats();
    return `
        <!DOCTYPE html>
        <html>
        <body>
            <h2>Code Analysis</h2>
            <pre>${JSON.stringify(stats, null, 2)}</pre>
            <script>
                // Interactive analysis viewer
                const data = ${JSON.stringify(stats)};
                // Add visualization logic here
            </script>
        </body>
        </html>
    `;
}

function updateStatusBar(text: string): void {
    const statusBar = vscode.window.createStatusBarItem();
    statusBar.text = `$(radio-tower) ${text}`;
    statusBar.show();
}
