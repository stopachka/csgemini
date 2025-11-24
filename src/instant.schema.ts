// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/react";

const _schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
      imageURL: i.string().optional(),
      type: i.string().optional(),
    }),
    maps: i.entity({
      name: i.string(),
      thumbnail: i.string().optional(), // Just in case
    }),
  },
  links: {
  },
  rooms: {
    // We'll use the mapId as the room slug. 
    // Since room slugs are dynamic, we can define a generic room type or specific ones.
    // If we want strictly typed rooms for every map, we'd need to know them ahead of time or use a pattern?
    // InstantDB rooms are defined by the second argument to db.room(type, slug).
    // We can just use a generic type "game" and the mapId as the slug.
    game: {
      presence: i.entity({
        x: i.number(),
        y: i.number(),
        z: i.number(),
        rotation: i.number(),
        color: i.string(),
        name: i.string(),
        hp: i.number(),
        state: i.string(), // 'alive' | 'dying' | 'dead'
        shotId: i.number().optional(),
        shotTarget: i.string().optional(),
      }),
      topics: {
        hit: i.entity({
            targetId: i.string(),
            damage: i.number(),
            shooterId: i.string().optional(),
        }),
      }
    },
  },
});

// This helps Typescript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;