import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { X } from "lucide-react"
import { Command, CommandList, CommandItem } from "@/components/ui/command"

export default function CategoryInput({ value = [], onChange, suggestions = [] }) {
  const [input, setInput] = useState("")

  const filtered = useMemo(() => {
    if (!input.trim()) return suggestions.filter((s) => !value.includes(s))
    return suggestions.filter(
      (s) => s.toLowerCase().includes(input.toLowerCase()) && !value.includes(s)
    )
  }, [input, suggestions, value])

  const addCategory = (cat) => {
    const newValue = [...value, cat]
    onChange(newValue)
    setInput("")
  }

  const removeCategory = (cat) => {
    const newValue = value.filter((v) => v !== cat)
    onChange(newValue)
  }

  const handleKeyDown = (e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault()
      const newCat = input.trim()
      if (newCat && !value.includes(newCat)) addCategory(newCat)
    } else if (e.key === "Backspace" && input === "" && value.length > 0) {
      removeCategory(value[value.length - 1])
    }
  }

  return (
    <div className="relative w-full">
      <div className="flex flex-wrap items-center gap-2 bg-transparent border border-white/10 rounded-lg px-2 py-1.5">
        <AnimatePresence>
          {value.map((cat) => (
            <motion.div
              key={cat}
              layout
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <Badge
                variant="secondary"
                className="bg-blue-500/20 text-blue-300 hover:bg-blue-600/30 flex items-center gap-1"
              >
                {cat}
                <X
                  size={12}
                  onClick={() => removeCategory(cat)}
                  className="cursor-pointer ml-1 hover:text-red-400"
                />
              </Badge>
            </motion.div>
          ))}
        </AnimatePresence>
        <input
          className="flex-1 bg-transparent text-white focus:outline-none px-1"
          placeholder="Type category..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {filtered.length > 0 && (
        <Command className="absolute z-10 mt-1 w-full bg-[#1b1f3b] border border-white/10 rounded-lg text-white shadow-lg">
          <CommandList>
            {filtered.slice(0, 6).map((item) => (
              <CommandItem
                key={item}
                onSelect={() => addCategory(item)}
                className="px-3 py-2 hover:bg-white/10 cursor-pointer"
              >
                {item}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      )}
    </div>
  )
}
