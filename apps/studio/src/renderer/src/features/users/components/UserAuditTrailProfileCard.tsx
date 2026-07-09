import { Clapperboard, FileText, Image, ListTree } from "lucide-react";

import type { AuditTrailActivityStats, AuditTrailProfileSummary } from "../utils/buildAuditTrailProfile";

interface UserAuditTrailProfileCardProps {
  profile: AuditTrailProfileSummary;
  stats: AuditTrailActivityStats;
}

interface StatItem {
  icon: typeof FileText;
  label: string;
  value: number;
}

function buildStatItems(profile: AuditTrailProfileSummary, stats: AuditTrailActivityStats): StatItem[] {
  if (profile.kind === "team_user") {
    return [
      { icon: FileText, label: "Print requests", value: stats.printRequests },
      { icon: Image, label: "Designs uploaded", value: stats.designsUploaded },
      { icon: ListTree, label: "Recent events", value: stats.recentEvents },
    ];
  }

  return [
    { icon: FileText, label: "Print requests", value: stats.printRequests },
    { icon: Clapperboard, label: "Queued to show", value: stats.queuedShows },
    { icon: ListTree, label: "Recent events", value: stats.recentEvents },
  ];
}

export function UserAuditTrailProfileCard({ profile, stats }: UserAuditTrailProfileCardProps) {
  const statItems = buildStatItems(profile, stats);

  return (
    <section aria-label="User info summary" className="user-audit-trail-profile">
      <p className="user-audit-trail-profile-eyebrow">User info</p>

      <div aria-hidden="true" className="user-audit-trail-profile-avatar">
        {profile.initials}
      </div>

      <h2 className="user-audit-trail-profile-name" id="user-audit-trail-title">
        {profile.displayName}
      </h2>

      <p className="user-audit-trail-profile-meta">{profile.metadataItems.join(" · ")}</p>

      <div className="user-audit-trail-profile-divider" role="presentation" />

      <div className="user-audit-trail-profile-stats">
        {statItems.map((item) => {
          const Icon = item.icon;

          return (
            <div className="user-audit-trail-profile-stat" key={item.label}>
              <Icon aria-hidden="true" size={18} strokeWidth={2} />
              <span className="user-audit-trail-profile-stat-value">{item.value}</span>
              <span className="user-audit-trail-profile-stat-label">{item.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
