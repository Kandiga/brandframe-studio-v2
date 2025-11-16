# Mobile Wizard User Guide

## Overview

The mobile storyboard creation experience has been completely redesigned with a step-by-step wizard that eliminates the need for excessive scrolling. Users can now create storyboards efficiently on mobile devices with a guided workflow.

## Key Features

### 1. Multi-Step Wizard
- **5 Clear Steps**: Assets → Visuals → Settings → Story → Review
- **Progress Indicator**: Visual progress bar showing current position and completion percentage
- **Step Navigation**: Back/Next buttons fixed at the bottom for easy access
- **Visual Step Indicators**: Numbered circles showing completed, current, and upcoming steps

### 2. Draft Management System
- **Auto-Save**: Drafts automatically save every 30 seconds
- **Manual Save**: "Save Draft" button available at any time
- **Draft Recovery**: Automatic prompt to resume unfinished drafts on app launch
- **Resume Exactly Where You Left Off**: Returns to the exact step where you stopped

### 3. Step-by-Step Breakdown

#### Step 1: Brand Assets (Required)
- Upload brand logo
- Upload main character reference
- At least one asset required to proceed
- Clear visual feedback with preview thumbnails

#### Step 2: Visual Enhancements (Optional)
- Add background reference image
- Add art style reference
- Upload additional characters (up to 9 more)
- All fields are optional and can be skipped

#### Step 3: Scene Settings (Required)
- Choose number of frames (2, 4, 6, or 8)
- Select aspect ratio (16:9 Landscape or 9:16 Portrait)
- Large, touch-friendly buttons with visual previews

#### Step 4: Tell Your Story (Required)
- Large textarea optimized for mobile typing
- Character counter with helpful feedback
- Tips for writing effective stories
- Minimum 50 characters recommended

#### Step 5: Review & Generate
- Comprehensive summary of all selections
- Preview of uploaded images
- Edit buttons to jump back to any step
- Final "Generate Storyboard" button

### 4. Mobile-Specific Improvements
- **No Scrolling Required**: Each step fits comfortably on one screen
- **Touch-Optimized**: All buttons are minimum 44x44 pixels
- **Fixed Navigation**: Bottom navigation always accessible
- **Safe Area Support**: Properly handles iPhone notches and home indicators
- **Smooth Transitions**: Animated transitions between steps

### 5. Desktop Behavior
- Desktop experience remains completely unchanged
- Wizard only appears on screens below 1024px width
- Full sidebar + input panel + dashboard layout on desktop

## How to Use

### Starting a New Storyboard (Mobile)
1. Tap "Create New Storyboard" on the dashboard
2. The wizard opens at Step 1
3. Upload your assets and tap "Next"
4. Continue through each step
5. Review everything at Step 5
6. Tap "Generate Storyboard"

### Saving a Draft
1. At any step, tap "Save Draft" in the bottom navigation
2. Enter a name for your draft
3. Tap "Save"
4. Draft is saved with your current progress and can be resumed later

### Resuming a Draft
1. Open the app
2. If a draft exists, you'll see a recovery modal
3. Tap "Resume Draft" to continue where you left off
4. Tap "Start Fresh" to dismiss and create new storyboard

### Editing from Review Step
1. At Step 5 (Review), you can see all your selections
2. Each section has an "Edit" button
3. Tap "Edit" to jump back to that specific step
4. Make changes and navigate back to Step 5

## Technical Details

### Database Schema
```sql
CREATE TABLE storyboard_drafts (
  id uuid PRIMARY KEY,
  user_id text,
  title text,
  draft_data jsonb,
  step_position integer,
  thumbnail_url text,
  created_at timestamptz,
  updated_at timestamptz
);
```

### Draft Data Structure
Drafts store all wizard state including:
- All uploaded files (as base64)
- Story description
- Aspect ratio selection
- Frame count
- Current step position

### Components
- `StoryboardWizard.tsx` - Main wizard container
- `WizardProgress.tsx` - Step indicator with progress bar
- `WizardNavigation.tsx` - Bottom navigation with Back/Next/Save buttons
- `WizardStep.tsx` - Individual step wrapper
- `useDrafts.ts` - Hook for draft CRUD operations

## Benefits

1. **Reduced Cognitive Load**: Users focus on one task at a time
2. **No Excessive Scrolling**: Each step fits on screen
3. **Clear Progress Tracking**: Users always know where they are
4. **Safe to Interrupt**: Drafts save automatically, users can return anytime
5. **Better Validation**: Each step validates before proceeding
6. **Mobile-First UX**: Follows modern mobile app patterns
7. **No Desktop Impact**: Desktop users keep their existing workflow

## Future Enhancements

Potential improvements for future versions:
- Swipe gestures for step navigation
- Keyboard shortcuts for desktop wizard mode
- Draft templates/presets
- Collaborative drafts (with authentication)
- Cloud sync across devices
- Step-specific tooltips and onboarding
