// A pair's picture: real photos when lib/work.js has them, otherwise the Dunk drawing.
import Dunk from './Dunk';

export function WorkImage({ item, clean, viewBox }) {
  const src = clean ? item.after : item.before;
  if (src) {
    return <img src={src} alt={`${item.model}, ${clean ? 'after' : 'before'}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />;
  }
  return <Dunk clean={clean} colors={item.colors} viewBox={viewBox} />;
}
