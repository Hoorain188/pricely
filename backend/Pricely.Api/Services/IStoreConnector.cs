namespace Pricely.Api.Services;

/// <summary>
/// Contract for store connectors (Telemart, Mega.pk, Daraz, etc.)
/// </summary>
public interface IStoreConnector
{
    /// <summary>Store display name (e.g. "Telemart", "Mega.pk")</summary>
    string StoreName { get; }

    /// <summary>Syncs/scrapes the catalog for this store into the database.</summary>
    Task SyncAllProductsAsync();
}
