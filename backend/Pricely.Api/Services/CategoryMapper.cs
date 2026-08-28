namespace Pricely.Api.Services;

public static class CategoryMapper
{
    public static string Map(string title, string? productType = null, string? hint = null)
    {
        var t = " " + (title + " " + (productType ?? "")).ToLower() + " ";

        // AC ko kachra na samjho
        if (Has(t, "air conditioner", "split ac", "inverter ac", "dc inverter"))
            return "home_appliances";

        // ═══ QADAM 1: KACHRA — skip (other) ═══
        // toys, beauty, gym, batteries, scales — hamari categories mein nahi
        if (Has(t, "toy", "toys", "flying fairy", "spoon scale", "kitchen scale",
                   "hair conditioner", "shampoo", "perfume", "body mist", "lotion",
                   "washing bag", "laundry bag", "wrist wrap", "gym grip",
                   "lithium battery", "inverter battery", "solar inverter", "ups battery",
                   "slipper", "handbag", "clutch", "footwear", "bra ", "lingerie",
                   "panties", "briefs", "period", "resistance band", "ankle weight", "gym",
                   "yoga", "walnut opener", "garlic press", "vegetable slicer", "fruit slicer",
                   "flying car", "rc car", "slingshot"))
            return "other";

        // ═══ QADAM 2: PAKKE ACCESSORIES (ye hamesha accessory hain) ═══
        if (Has(t, "protector", "tempered glass", "screen guard",
                   "strap for", "band for", "wristband", "replacement band", "loop strap",
                   "case for", "cover for", "pouch", "sleeve for", "lens cover", "back cover", "flip cover",
                   "mount", "holder", "holder for", "bracket", "vesa", "stand for",
                   "mouse pad", "mousepad", "keyboard cover",
                   "charging cable", "data cable", "cable for", "power cable",
                   "repair parts", "trigger button", "conductive pad", "spare part",
                   "finger sleeve", "thumb glove", "gaming gloves",
                   "memory card", "sd card", "otg", "dongle", "hub",
                   "toner", "cartridge", "paper roll", "cooling fan", "cpu fan",
                   "charger adapter", "charging block", "power adapter", "wall charger",
                   "fast charger", "usb-c to", "type-c to"))
            return "accessories";

        // ═══ QADAM 3: ASAL PRODUCT TYPE ═══

        // --- AUDIO PEHLE (earphone/earbuds ke titles mein "smartphone" hota hai) ---
        if (Has(t, "earphone", "earbud", "headphone", "headset", "airpod", "handsfree",
                   "buds ", "tws", "speaker", "soundbar", "home theater", "wireless earbuds",
                   "jabra", "evolve", "speak 510", "bluetooth headphone"))
            return "audio";

        // --- PHONES ---
        if (Has(t, "iphone", "smartphone", "smart phone", "mobile phone", "cell phone",
                   "galaxy s2", "galaxy s1", "galaxy a0", "galaxy a1", "galaxy a2", "galaxy a3",
                   "galaxy a5", "galaxy a7", "galaxy z fold", "galaxy z flip", "galaxy note",
                   "redmi note", "redmi 1", "redmi a", "poco ", "infinix ", "tecno ",
                   "vivo y", "vivo v", "oppo a", "oppo reno", "realme ", "nokia ",
                   "itel ", "pixel ", "redmagic", "oneplus ", "honor x", "dual sim"))
            return "mobiles_tablets";

        // --- TABLETS ---
        if (Has(t, "ipad", "galaxy tab", "tablet pc", "kindle", "surface pro",
                   "redmi pad", "honor pad", "lenovo tab", "wifi tablet",
                   "xiaomi pad", "mi pad", "inch tablet"))
            return "mobiles_tablets";

        // --- LAPTOPS / COMPUTERS ---
        if (Has(t, "laptop", "notebook", "macbook", "chromebook", "thinkpad", "ideapad",
                   "vivobook", "zenbook", "inspiron", "latitude", "pavilion", "elitebook",
                   "probook", "victus", "predator", "nitro ", "rog strix", "tuf ",
                   "legion", "omnibook", "galaxy book", "mac mini", "mac studio", "imac",
                   "desktop pc", "all in one pc", "core i3", "core i5", "core i7", "core i9",
                   "core ultra", "ryzen "))
            return "laptops_computers";

        // --- PRINTERS / SCANNERS ---
        if (Has(t, "printer", "scanner", "photocopier", "laserjet", "ecotank", "pixma"))
            return "laptops_computers";

        // --- MONITORS ---
        if (Has(t, "monitor", "led moniter", "gaming monitor", "ips display"))
            return "laptops_computers";

        // --- GAMING (console, game stick, controller) ---
        if (Has(t, "playstation", "ps5", "ps4", "ps3", "xbox", "nintendo",
                   "gaming console", "game console", "game stick", "game box",
                   "gamepad", "joystick", "racing wheel", "steering wheel",
                   "gaming controller", "wireless controller", "dualshock", "dualsense"))
            return "gaming";

        // --- TV / PROJECTOR ---
        if (Has(t, "led tv", "smart tv", "qled", "oled tv", "4k tv", "android tv",
                   "television", "projector", "tv box", "android box", "apple tv",
                   "google tv", "uhd tv", "full hd tv"))
            return "tv_entertainment";

        // --- CAMERAS (asli) ---
        if (Has(t, "dslr", "mirrorless", "digital camera", "camera with", "eos ",
                   "coolpix", "gopro", "action camera", "camera lens ", "lens kit",
                   "drone", "gimbal", "stabilizer", "tripod", "monopod", "tripod stand",
                   "ring light"))
            return "cameras";

        // --- WEARABLES ---
        if (Has(t, "smart watch", "smartwatch", "fitness band", "smart band",
                   "fitness tracker", "apple watch", "galaxy watch", "pixel watch",
                   "mi band", "wrist watch", "men watch", "women watch", "watch series",
                   "watch ultra", "chronograph"))
            return "wearables";

        // --- HOME APPLIANCES ---
        if (Has(t, "refrigerator", "fridge", "freezer", "washing machine", "air conditioner",
                   "split ac", "inverter ac", "ton dc inverter", "vacuum cleaner",
                   "water dispenser", "geyser", "water heater", "room heater", "air cooler",
                   "ceiling fan", "pedestal fan", "iron ",
                   "therapy lamp", "infrared lamp"))
            return "home_appliances";

        // --- KITCHEN APPLIANCES ---
        if (Has(t, "blender", "air fryer", "toaster", "juicer", "food processor",
                   "microwave", "oven", "rice cooker", "coffee maker", "kettle",
                   "hand mixer", "dry mill", "sandwich maker", "pressure cooker",
                   "egg boiler", "chopper", "grinder",
                   "cooking range", "gas stove", "burner"))
            return "kitchen_appliances";

        // ═══ QADAM 4: BAAKI ACCESSORIES ═══
        if (Has(t, "charger", "cable", "adapter", "power bank", "powerbank",
                   "mouse", "keyboard", "case", "cover", "bag", "ssd", "hard drive",
                   "flash drive", "ram ", "graphic card", "processor", "pc case"))
            return "accessories";

        return hint ?? "other";
    }

    private static bool Has(string text, params string[] words)
    {
        foreach (var w in words)
            if (text.Contains(w)) return true;
        return false;
    }
}
