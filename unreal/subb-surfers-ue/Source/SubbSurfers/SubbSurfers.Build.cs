using UnrealBuildTool;

public class SubbSurfers : ModuleRules
{
    public SubbSurfers(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(new string[]
        {
            "Core",
            "CoreUObject",
            "Engine",
            "InputCore"
        });

        PrivateDependencyModuleNames.AddRange(new string[]
        {
            "EnhancedInput",
            "UMG",
            "Slate",
            "SlateCore"
        });
    }
}
