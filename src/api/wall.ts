import { readWalls } from '@/lib/wall-store';

export const getWallListAPI = async () => {
  return readWalls();
};
