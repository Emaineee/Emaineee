import dotenv from 'dotenv';
dotenv.config();

import app from './app';

const PORT = parseInt(process.env.PORT || '8080', 10);

app.listen(PORT, () => {
  console.log(`GuideTrack API running on port ${PORT}`);
});
