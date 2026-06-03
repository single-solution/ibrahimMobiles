#!/bin/bash
set -e

# Rename Admin components and files
cd apps/admin

# 1. Rename files
rename_file() {
    local src="$1"
    local dest="$2"
    if [ -f "$src" ]; then
        git mv "$src" "$dest"
    fi
}

rename_file src/components/layout/AdminTopHeader.tsx src/components/layout/TopHeader.tsx
rename_file src/components/layout/AdminFooter.tsx src/components/layout/Footer.tsx
rename_file src/components/layout/AdminMobileTopBar.tsx src/components/layout/MobileTopBar.tsx
rename_file src/components/layout/AdminShell.tsx src/components/layout/Shell.tsx
rename_file src/components/layout/AdminMobileMenu.tsx src/components/layout/MobileMenu.tsx
rename_file src/components/layout/AdminSessionProvider.tsx src/components/layout/SessionProvider.tsx

rename_file src/components/ui/AdminTable.tsx src/components/ui/Table.tsx

rename_file src/components/shared/adminWorkspaceUi.tsx src/components/shared/workspaceUi.tsx
rename_file src/components/shared/AdminListPageShell.tsx src/components/shared/ListPageShell.tsx

rename_file src/components/loading/AdminPageSkeleton.tsx src/components/loading/PageSkeleton.tsx
rename_file src/components/loading/AdminTableSkeleton.tsx src/components/loading/TableSkeleton.tsx

rename_file src/app/_components/dashboard/AdminMobileHubSections.tsx src/app/_components/dashboard/MobileHubSections.tsx
rename_file src/app/_components/dashboard/AdminMobileHubRowLink.tsx src/app/_components/dashboard/MobileHubRowLink.tsx
rename_file src/app/_components/dashboard/adminAlertsUi.tsx src/app/_components/dashboard/alertsUi.tsx

rename_file src/lib/adminApi.ts src/lib/api.ts
rename_file src/lib/adminPermissionsContext.tsx src/lib/permissionsContext.tsx
rename_file src/lib/url/useAdminUrlParams.ts src/lib/url/useUrlParams.ts
rename_file src/lib/chat/buildAdminAssistantTestContext.ts src/lib/chat/buildAssistantTestContext.ts

# 2. String replacements in apps/admin (using perl/sed)
# Note: we should be careful not to rename things like AdminRole or AdminUser if they are exported from shared. 
# But in apps/admin, most components with Admin prefix can just drop it.

replace_string() {
    local search="$1"
    local replace="$2"
    if [ "$(uname)" = "Darwin" ]; then
        find src -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i '' "s/$search/$replace/g"
    else
        find src -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i "s/$search/$replace/g"
    fi
}

replace_string "AdminTopHeader" "TopHeader"
replace_string "AdminFooter" "Footer"
replace_string "AdminMobileTopBar" "MobileTopBar"
replace_string "AdminShell" "Shell"
replace_string "AdminMobileMenu" "MobileMenu"
replace_string "AdminSessionProvider" "SessionProvider"

replace_string "AdminTable" "Table"
replace_string "AdminTableColumn" "TableColumn"

replace_string "adminWorkspaceUi" "workspaceUi"
replace_string "AdminListPageShell" "ListPageShell"

replace_string "AdminPageSkeleton" "PageSkeleton"
replace_string "AdminTableSkeleton" "TableSkeleton"

replace_string "AdminMobileHubSections" "MobileHubSections"
replace_string "AdminMobileHubRowLink" "MobileHubRowLink"
replace_string "adminAlertsUi" "alertsUi"

replace_string "adminApi" "api"
replace_string "adminFetch" "apiFetch"
replace_string "AdminApiError" "ApiError"

replace_string "adminPermissionsContext" "permissionsContext"
replace_string "useAdminUrlParams" "useUrlParams"
replace_string "buildAdminAssistantTestContext" "buildAssistantTestContext"

# Specific replacements for path imports
replace_string "adminWorkspaceUi" "workspaceUi"

cd ../web

# 1. Rename files in apps/web
rename_file src/components/layout/StorefrontChrome.tsx src/components/layout/AppShell.tsx

if [ -d src/lib/storefront ]; then
    git mv src/lib/storefront src/lib/core
fi

if [ -d src/app/api/storefront ]; then
    # Move all contents of api/storefront to api/
    for file in src/app/api/storefront/*; do
        git mv "$file" src/app/api/
    done
    rm -rf src/app/api/storefront
fi

# 2. String replacements in apps/web
replace_string "StorefrontChrome" "AppShell"
replace_string "lib/storefront" "lib/core"
replace_string "api/storefront" "api"

replace_string "getStorefrontCategoriesCached" "getCategoriesCached"
replace_string "getStorefrontCategoryBySlugCached" "getCategoryBySlugCached"
replace_string "getStorefrontBrandBySlugCached" "getBrandBySlugCached"
replace_string "getStorefrontBrandsCached" "getBrandsCached"
replace_string "getStorefrontGradesCached" "getGradesCached"
replace_string "getStorefrontGradeCountsCached" "getGradeCountsCached"
replace_string "getStorefrontAttributesCached" "getAttributesCached"
replace_string "getStorefrontProductBySlugCached" "getProductBySlugCached"
replace_string "getStorefrontProductsPageCached" "getProductsPageCached"
replace_string "getStorefrontProducts" "getProducts"
replace_string "getStorefrontProductLiveCommerce" "getProductLiveCommerce"
replace_string "getStorefrontBaseUrl" "getBaseUrl"
replace_string "getStorefrontSitemapProductsCached" "getSitemapProductsCached"
replace_string "getStorefrontSitemapBrandsCached" "getSitemapBrandsCached"

replace_string "StorefrontCategoryReference" "CategoryReference"
replace_string "StorefrontReferenceProvider" "ReferenceProvider"
replace_string "StorefrontReferenceData" "ReferenceData"
replace_string "StorefrontProductFilters" "ProductFilters"
replace_string "StorefrontCategory" "CategoryMeta"

