import gradient from 'gradient-string';

const RawTags = {
  System: {colors: ['#66FF66', '#00CC66']},
  Git: {colors: ['#ff8566ff', '#cc9c00ff']},
  AI: {colors: ['#66a3ffff', '#007accff']},
  Info: {colors: ['#A463BF', '#8E43AD']},
  Error: {colors: ['#C0382B', '#E84B3C']},
  Warn: {colors: ['#f9fd12ff', '#ad8e00ff']},
  Debug: {colors: ['#3398DB', '#2980B9']},
};

type TagConfig = {colors: string[]};
type RawTagMap = typeof RawTags;

const Tags = Object.fromEntries(
  (Object.entries(RawTags) as [keyof RawTagMap, TagConfig][]).map(([key, {colors}]) => {
    const fn = gradient(colors);
    return [key, fn(key)];
  })
) as {[K in keyof RawTagMap]: string};

export default Tags;