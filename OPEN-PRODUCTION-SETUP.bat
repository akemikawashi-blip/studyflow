@echo off
setlocal
chcp 65001 >nul
title StudyFlow - Production Setup Pages

echo Opening the pages needed to finish the public launch...
start "" "https://vercel.com/new"
start "" "https://supabase.com/dashboard/project/xuubragcavogbjlwsiia/settings/api"
start "" "https://supabase.com/dashboard/project/xuubragcavogbjlwsiia/auth/url-configuration"
start "" "DEPLOYMENT-GUIDE.md"
exit /b 0
