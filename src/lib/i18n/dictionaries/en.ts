import type { ko } from './ko';

export const en: Record<keyof typeof ko, string> = {
  // Common UI
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.edit': 'Edit',
  'common.delete': 'Delete',
  'common.search': 'Search',
  'common.next': 'Next',
  'common.prev': 'Previous',
  'common.confirm': 'Confirm',
  'common.close': 'Close',
  'common.required': 'Required',
  'common.loading': 'Loading...',
  'common.noData': 'No data',
  'common.searchPlaceholder': 'Search...',

  // Menu labels
  'menu.dashboard': 'Dashboard',
  'menu.myPage': 'My Page',
  'menu.organization': 'Organization',
  'menu.employees': 'Employees',
  'menu.appointments': 'Appointments',
  'menu.attendance': 'Attendance',
  'menu.leave': 'Leave',
  'menu.payroll': 'Payroll',
  'menu.recruitment': 'Recruitment',
  'menu.training': 'Training',
  'menu.evaluation': 'Evaluation',
  'menu.approval': 'Approvals',
  'menu.contracts': 'Contracts',
  'menu.auditLog': 'Audit Log',
  'menu.settings': 'Settings',

  // Menu descriptions
  'menuDesc.dashboard': 'Main dashboard',
  'menuDesc.myPage': 'Manage my profile',
  'menuDesc.organization': 'Organization structure',
  'menuDesc.employees': 'Employee records',
  'menuDesc.appointments': 'HR appointments',
  'menuDesc.attendance': 'Attendance management',
  'menuDesc.leave': 'Leave requests',
  'menuDesc.payroll': 'Payroll management',
  'menuDesc.recruitment': 'Job postings and applicants',
  'menuDesc.training': 'Training programs',
  'menuDesc.evaluation': 'Performance reviews',
  'menuDesc.approval': 'Electronic approval',
  'menuDesc.contracts': 'Employment contracts',
  'menuDesc.auditLog': 'System audit log',
  'menuDesc.settings': 'System settings',

  // Menu groups
  'menuGroup.home': 'Home',
  'menuGroup.hr': 'HR',
  'menuGroup.work': 'Work',
  'menuGroup.payroll': 'Payroll',
  'menuGroup.talent': 'Talent',
  'menuGroup.support': 'Support',
  'menuGroup.system': 'System',

  // Header
  'header.myInfo': 'My Info',
  'header.logout': 'Logout',
  'header.kbdHint': '⌘K',

  // Command Palette
  'commandPalette.title': 'Global Search',
  'commandPalette.description': 'Search employees and menus',
  'commandPalette.inputPlaceholder': 'Type to search... (employees, menus)',
  'commandPalette.empty': 'No results.',
  'commandPalette.groupEmployees': 'Employees',
  'commandPalette.groupMenus': 'Menus',

  // Language
  'language.korean': '한국어',
  'language.english': 'English',
  'language.label.ko': '한',
  'language.label.en': 'EN',

  // Roles
  'role.admin': 'System Admin',
  'role.hr_manager': 'HR Manager',
  'role.dept_manager': 'Department Manager',
  'role.employee': 'Employee',

  // Notifications
  'notification.title': 'Notifications',
  'notification.unreadBadge': '{{count}} unread',
  'notification.markAllRead': 'Mark all read',
  'notification.clearAllConfirm': 'Delete all notifications?',
  'notification.empty': 'No notifications.',
  'notification.timeAgo.justNow': 'just now',
  'notification.timeAgo.minutes': '{{count}}m ago',
  'notification.timeAgo.hours': '{{count}}h ago',
  'notification.timeAgo.days': '{{count}}d ago',

  // Toasts
  'toast.saved': 'Saved.',
  'toast.deleted': 'Deleted.',
  'toast.updated': 'Updated.',
  'toast.error': 'An error occurred.',
  'toast.networkError': 'Network error.',
  'toast.requiredField': 'Please fill in required fields.',
};
