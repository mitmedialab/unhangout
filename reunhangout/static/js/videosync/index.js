export {default as SyncableVideo} from './containers/SyncableVideo';
export const isEmbedSyncable = (embed) => {
  return embed.type === "youtube";
}
