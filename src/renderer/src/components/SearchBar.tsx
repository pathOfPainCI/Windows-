interface Props {
  value: string
  onChange(v: string): void
}

export function SearchBar({ value, onChange }: Props) {
  return (
    <div className="searchbar">
      <input
        placeholder="搜索…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
