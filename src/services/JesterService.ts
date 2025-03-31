import { EventEmitter } from 'events';

export class JesterService extends EventEmitter {
  private jokes: string[] = [
    "Why did the crypto trader go to the gym? To work on his 'bit'ceps!",
    "What do you call a blockchain developer's favorite drink? Block-tail!",
    "Why was the Bitcoin investor always calm? Because he had HODL nerves of steel!",
    "How does a crypto miner stay cool? They use a 'hash' air conditioner!",
    "What do you call a cryptocurrency that's always joking around? Jest-coin!"
  ];

  constructor() {
    super();
    this.initializeJesterEvents();
  }

  private initializeJesterEvents() {
    setInterval(() => {
      this.emit('jesterJoke', this.getRandomJoke());
    }, 300000); // Emit a joke every 5 minutes
  }

  public getRandomJoke(): string {
    const randomIndex = Math.floor(Math.random() * this.jokes.length);
    return this.jokes[randomIndex];
  }

  public addJoke(joke: string): void {
    this.jokes.push(joke);
    this.emit('newJoke', joke);
  }

  public async fetchJokeFromAPI(): Promise<string> {
    try {
      const response = await fetch('https://official-joke-api.appspot.com/random_joke');
      const data = await response.json();
      const joke = `${data.setup} ${data.punchline}`;
      this.addJoke(joke);
      return joke;
    } catch (error) {
      console.error('Failed to fetch joke from API:', error);
      return this.getRandomJoke(); // Fallback to a local joke
    }
  }
}

// Usage example
const jesterService = new JesterService();

jesterService.on('jesterJoke', (joke) => {
  console.log('Jester says:', joke);
});

jesterService.on('newJoke', (joke) => {
  console.log('New joke added:', joke);
});

// Fetch a new joke from API every hour
setInterval(async () => {
  const newJoke = await jesterService.fetchJokeFromAPI();
  console.log('New joke from API:', newJoke);
}, 3600000);

export default jesterService;