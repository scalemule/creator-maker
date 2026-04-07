import { CreatorMakerClient } from './core/CreatorMakerClient';
import type { CreatorMakerConfig } from './types';

export const ScaleMuleCreatorMaker = {
  create(config: CreatorMakerConfig): CreatorMakerClient {
    return new CreatorMakerClient(config);
  },
};

export type { CreatorMakerConfig };
