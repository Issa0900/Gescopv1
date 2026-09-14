import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export default function ManualTableOfContents({ groups, onActiveSectionChange }) {
  const [activeSection, setActiveSection] = useState(groups[0]?.sections[0]?.id || "");
  const [activeHeading, setActiveHeading] = useState("");
  const [expandedSection, setExpandedSection] = useState(activeSection);
  const clickScrollRef = useRef(false);

  const allSections = groups.flatMap((g) => g.sections);

  // Scroll-spy for active section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (clickScrollRef.current) return;
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id.replace("section-", "");
            setActiveSection(id);
            setExpandedSection(id);
            if (onActiveSectionChange) onActiveSectionChange(id);
          }
        });
      },
      { rootMargin: "-15% 0px -75% 0px", threshold: 0 }
    );

    allSections.forEach((s) => {
      const el = document.getElementById(`section-${s.id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [groups, onActiveSectionChange]);

  // Scroll-spy for active heading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (clickScrollRef.current) return;
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveHeading(entry.target.id);
          }
        });
      },
      { rootMargin: "-25% 0px -70% 0px", threshold: 0 }
    );

    allSections.forEach((s) => {
      s.content.forEach((_, i) => {
        const el = document.getElementById(`heading-${s.id}-${i}`);
        if (el) observer.observe(el);
      });
    });

    return () => observer.disconnect();
  }, [groups]);

  const handleSectionClick = (id) => {
    setActiveSection(id);
    setExpandedSection(id);
    clickScrollRef.current = true;
    const el = document.getElementById(`section-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => { clickScrollRef.current = false; }, 800);
  };

  const handleHeadingClick = (sectionId, headingIdx) => {
    clickScrollRef.current = true;
    setActiveHeading(`heading-${sectionId}-${headingIdx}`);
    const el = document.getElementById(`heading-${sectionId}-${headingIdx}`);
    if (el) {
      const offset = 80;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
    setTimeout(() => { clickScrollRef.current = false; }, 800);
  };

  return (
    <nav className="space-y-3">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.sections.map((s) => {
              const isActive = activeSection === s.id;
              const isExpanded = expandedSection === s.id;
              return (
                <div key={s.id}>
                  <button
                    onClick={() => handleSectionClick(s.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <s.icon className="h-4 w-4 shrink-0" />
                    {s.title}
                  </button>
                  {isExpanded && s.content.length > 1 && (
                    <ul className="ml-7 mt-0.5 space-y-0 border-l border-border/60 pl-3">
                      {s.content.map((block, i) => (
                        <li key={i}>
                          <button
                            onClick={() => handleHeadingClick(s.id, i)}
                            className={cn(
                              "block w-full truncate py-1 pr-2 text-left text-xs leading-snug transition-colors",
                              activeHeading === `heading-${s.id}-${i}`
                                ? "font-medium text-primary"
                                : "text-muted-foreground/80 hover:text-foreground"
                            )}
                            title={block.h}
                          >
                            {block.h}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}