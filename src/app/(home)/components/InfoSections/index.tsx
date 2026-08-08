import { getWallListAPI } from '@/api/wall';

import { Freedom } from './Freedom';
import { Gallery } from './Gallery';
import { Location } from './Location';
import { Milestone } from './Milestone';
import { OpenSource } from './OpenSource';
import { Quote } from './Quote';
// import { Skills } from './Skills';
import { Sponsor } from './Sponsor';
import { Story } from './Story';
import { Wall } from './Wall';
// import { Works } from './Works';

export async function InfoSections() {
  const walls = (await getWallListAPI()).slice(0, 42);

  return (
    <>
      <Location />
      <Story />
      <Freedom />
      <Gallery />
      <OpenSource />
      {/* <Works /> */}
      {/* <Skills /> */}
      <Sponsor />
      <Wall walls={walls} />
      <Quote />
      <Milestone />
    </>
  );
}
