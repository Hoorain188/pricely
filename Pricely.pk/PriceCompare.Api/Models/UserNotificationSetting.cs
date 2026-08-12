using System;
using System.Collections.Generic;

namespace PriceCompare.Api.Models;

public partial class UserNotificationSetting
{
    public long UserId { get; set; }

    public bool NewReports { get; set; }

    public bool SyncFailures { get; set; }

    public bool WeeklySummaryEmail { get; set; }

    public virtual User User { get; set; } = null!;
}
