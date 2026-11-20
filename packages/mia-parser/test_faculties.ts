import { MiaDteuProvider } from './src/index';

const provider = new MiaDteuProvider();
provider.getFaculties().then(faculties => {
  console.log('Faculties:', faculties);
}).catch(console.error);
