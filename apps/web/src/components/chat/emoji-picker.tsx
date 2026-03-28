'use client';

import React, { useState, useRef, useEffect } from 'react';

const CATEGORIES: { label: string; icon: string; emojis: string[] }[] = [
  {
    label: 'Smileys',
    icon: '😊',
    emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱'],
  },
  {
    label: 'Gestures',
    icon: '👋',
    emojis: ['👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾'],
  },
  {
    label: 'People',
    icon: '👤',
    emojis: ['👶','🧒','👦','👧','🧑','👱','👨','🧔','👩','🧓','👴','👵','🙍','🙎','🙅','🙆','💁','🙋','🧏','🙇','🤦','🤷','👮','🕵','💂','🥷','👷','🤴','👸','🧙','🧚','🧛','🧜','🧝','🧞','🧟','💆','💇','🚶','🧍','🧎','🏃','💃','🕺','🧖','👫','👬','👭'],
  },
  {
    label: 'Animals',
    icon: '🐶',
    emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🕷','🦎','🐍','🐢','🦕','🦖','🦑','🐙','🦐','🦀','🐡','🐟','🐬','🐳','🦈','🐊','🦭','🦦','🦫'],
  },
  {
    label: 'Food',
    icon: '🍕',
    emojis: ['🍎','🍊','🍋','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🫒','🥑','🍆','🥦','🥬','🥒','🌽','🫑','🥕','🧅','🧄','🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🌮','🌯','🥙','🧆','🥚','🍱','🍣','🍜','🍛','🍲','🥘','🫕','🍝','🥗','🫔'],
  },
  {
    label: 'Travel',
    icon: '✈️',
    emojis: ['🚗','🚕','🚙','🚌','🚎','🏎','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🛵','🏍','🛺','🚲','🛴','🛹','🚏','🚦','🚥','🛣','🛤','⛽','🚧','🛞','🚨','🚔','🚍','🚘','🚖','🚡','🚠','🚟','🚃','🚋','🚝','🚄','🚅','🚈','🚂','🚆','🚇','🚊','🚉','✈️','🛫','🛬','🛩','💺','🚀','🛸','🪂','⛵','🛥','🚢'],
  },
  {
    label: 'Objects',
    icon: '💡',
    emojis: ['⌚','📱','💻','⌨️','🖥','🖨','🖱','🖲','🕹','📺','📷','📸','📹','🎥','📽','🎞','📞','☎️','📟','📠','📺','📻','🎙','🎚','🎛','🧭','⏱','⏲','⏰','🕰','📡','🔋','🔌','💡','🔦','🕯','💰','💳','💎','⚖️','🔧','🔨','⚒','🛠','⛏','🔩','🪛','🔫','🛡','🪚','🗡','⚔️','🏹','🪃','🪝','🔍','🔎','🔬','🔭','📡'],
  },
  {
    label: 'Symbols',
    icon: '❤️',
    emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉','☯️','✡️','🔯','🪯','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵','🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘','❌','⭕','🛑','⛔'],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState(0);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const displayEmojis = search
    ? CATEGORIES.flatMap(c => c.emojis).filter(e => {
        // basic search: just filter emojis that match the input codepoint description
        return e.includes(search);
      })
    : CATEGORIES[activeCategory].emojis;

  return (
    <div
      ref={ref}
      className="absolute bottom-14 left-0 z-50 w-72 sm:w-80 rounded-xl border border-white/10 bg-[#1e1e2e] shadow-2xl flex flex-col overflow-hidden"
    >
      {/* Search */}
      <div className="p-2 border-b border-white/10">
        <input
          autoFocus
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search emoji…"
          className="w-full bg-white/5 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-blue-500/50"
        />
      </div>

      {/* Category tabs */}
      {!search && (
        <div className="flex border-b border-white/10 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat, i) => (
            <button
              key={cat.label}
              onClick={() => setActiveCategory(i)}
              title={cat.label}
              className={`flex-shrink-0 px-3 py-2 text-base transition-colors ${
                activeCategory === i ? 'text-white bg-white/10' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className="p-2 max-h-52 overflow-y-auto no-scrollbar">
        <div className="grid grid-cols-8 gap-0.5">
          {displayEmojis.map((emoji, i) => (
            <button
              key={i}
              onClick={() => { onSelect(emoji); onClose(); }}
              className="text-xl p-1.5 rounded-md hover:bg-white/10 transition-colors leading-none"
            >
              {emoji}
            </button>
          ))}
          {displayEmojis.length === 0 && (
            <span className="col-span-8 text-center text-white/40 text-sm py-4">No results</span>
          )}
        </div>
      </div>
    </div>
  );
}
