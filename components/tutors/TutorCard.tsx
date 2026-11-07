import Link from "next/link";
import { getFaculty, specializationName } from "@/lib/data";
import { formatDate, formatTime } from "@/lib/time";
import type { TutorWithNext } from "@/lib/server/tutors";
import { TiltPanel } from "@/components/ui/TiltPanel";
import { Stars } from "@/components/ui/Stars";
import { FavoriteButton } from "./FavoriteButton";

export function TutorCard({ tutor, favorite, signedIn }: { tutor: TutorWithNext; favorite: boolean; signedIn: boolean }) {
  const faculty = getFaculty(tutor.faculty)!;
  return (
    <TiltPanel accent={faculty.accent} className="h-full">
      <Link href={`/tutors/${tutor.id}`} className="flex h-full flex-col p-6">
        <div className="flex items-start justify-between">
          <div className="grid h-14 w-14 place-items-center rounded-full font-display text-xl" style={{ background: `radial-gradient(circle at 30% 30%, ${faculty.accent}55, #111117 70%)`, border: `1px solid ${faculty.accent}44` }}>
            {tutor.initials}
          </div>
          <FavoriteButton tutorId={tutor.id} initial={favorite} signedIn={signedIn} />
        </div>
        <div className="mt-5">
          <div className="eyebrow" style={{ color: faculty.accent }}>{faculty.name}</div>
          <h3 className="mt-1 font-display text-2xl">{tutor.name}</h3>
          <p className="mt-1 text-sm text-bone-dim">{tutor.title}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {tutor.specializations.map((s) => (
            <span key={s} className="chip">{specializationName(tutor.faculty, s)}</span>
          ))}
        </div>
        <div className="mt-auto flex items-end justify-between pt-6">
          <div>
            <Stars rating={tutor.rating} reviews={tutor.reviews} />
            <div className="mt-1 text-xs text-bone-mute">
              {tutor.next ? <>Next: <span className="text-bone-dim">{formatDate(tutor.next.date, { weekday: "short", month: "short", day: "numeric" })}, {formatTime(tutor.next.start)}</span></> : "Fully booked"}
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-2xl">${tutor.rate}</div>
            <div className="text-[11px] text-bone-mute">per hour</div>
          </div>
        </div>
      </Link>
    </TiltPanel>
  );
}
