const { execSync } = require('child_process');
const readline = require('readline');

class FunLauncher {
    constructor() {
        this.asciiArt = `
   🌟 Web3 Quantum Stream 🌟
    ____________________
   |  ✨ Ready to fly? ✨ |
    ~~~~~~~~~~~~~~~~~~~~
        |  |
       (o__o)
      (_____)
     (______)
    (______)
      (__)
    `;
    }

    async launch() {
        console.clear();
        console.log('\x1b[35m%s\x1b[0m', this.asciiArt);

        const modes = [
            '🚀 Quick Launch (Standard)',
            '🎮 Game Dev Mode',
            '🧪 Quantum Mode',
            '🎵 Music Mode'
        ];

        console.log('\nChoose your launch mode:');
        modes.forEach((mode, i) => console.log(`${i + 1}. ${mode}`));

        const answer = await this.prompt('\nEnter number (1-4): ');

        switch (answer) {
            case '1':
                this.runMode('standard');
                break;
            case '2':
                this.runMode('game');
                break;
            case '3':
                this.runMode('quantum');
                break;
            case '4':
                this.runMode('music');
                break;
            default:
                console.log('Invalid choice! Starting standard mode...');
                this.runMode('standard');
        }
    }

    runMode(mode) {
        console.clear();
        const commands = {
            standard: 'npm run start:all',
            game: 'npm run start:dev -- --mode=game',
            quantum: 'npm run start:optimized -- --quantum',
            music: 'npm run start:dev -- --visualization=music'
        };

        console.log('\x1b[36m%s\x1b[0m', `🎉 Launching ${mode} mode...`);
        try {
            execSync(commands[mode], { stdio: 'inherit' });
        } catch (error) {
            console.error('Launch failed! Trying backup mode...');
            execSync('npm run quick:start', { stdio: 'inherit' });
        }
    }

    prompt(question) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise(resolve => rl.question(question, ans => {
            rl.close();
            resolve(ans);
        }));
    }
}

if (require.main === module) {
    const launcher = new FunLauncher();
    launcher.launch();
}
