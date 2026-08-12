using System;
using System.Collections.Generic;

namespace PriceCompare.Api.Models;

public partial class User
{
    public long Id { get; set; }

    public string Name { get; set; } = null!;

    public string Email { get; set; } = null!;

    public string PasswordHash { get; set; } = null!;

    public string? Phone { get; set; }

    public string? Location { get; set; }

    public string? AvatarUrl { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<ActivityLog> ActivityLogs { get; set; } = new List<ActivityLog>();

    public virtual ICollection<Favorite> Favorites { get; set; } = new List<Favorite>();

    public virtual ICollection<MatchGroup> MatchGroups { get; set; } = new List<MatchGroup>();

    public virtual ICollection<PriceAlert> PriceAlerts { get; set; } = new List<PriceAlert>();

    public virtual ICollection<SearchQuery> SearchQueries { get; set; } = new List<SearchQuery>();

    public virtual ICollection<Session> Sessions { get; set; } = new List<Session>();

    public virtual ICollection<StoreClick> StoreClicks { get; set; } = new List<StoreClick>();

    public virtual ICollection<TeamRequest> TeamRequestInvitedByNavigations { get; set; } = new List<TeamRequest>();

    public virtual ICollection<TeamRequest> TeamRequestReviewedByNavigations { get; set; } = new List<TeamRequest>();

    public virtual UserNotificationSetting? UserNotificationSetting { get; set; }
}
