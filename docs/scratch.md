Context
    - 300-400 users
    - 2-3 day event
    - High Traffic, Quiet Nights
    

WorkFlow:
    - User logs in with QR code

    - Some Welcome page, Speaker Intro Video

    - Basic details
        - No auth, No SSO, No Passwords
        - Only name and email
        - Type of attendee
            - Verify from invitee list

    - Inside the app
        - Starts with a Tour
            - Options: Next, Back, Skip Tour
        - Will live as PWA on users phone
        - User must come back to this point when
        
        - Dashboard
            - Live Ongoing Events
            - Points earned
            - Some Sponsor

        - Agenda
            - Day 1, 2, 3: Agenda of each day
                - Event: Name, Location, From Time - To Time
            - User can give feedback after event is done

        - Explore
            - Initiatives
                - Project: Name, Context, Preview, Splash
            - Feedback to ATS team
                - Each user can give this
                
        - Activities
            - Interactive games with points
                - Ways to earn point for each user
                - Each activity has points
                - Each activity is one-time

                - AI Avatar
                    - User uploads picture/clicks picture
                    - AI generates an avatar based on a prompt
                    - Avatar gets generated, previewed and saved as profile picture
                    - User can also get this printed

                - Trivia
                    - Q/A 50 questions in 60 minutes
                    - MCQ based
                    - Has a timer

                - Prompt Challenge
                    - Categories
                        - Each catergory has a question and 5 prompts
                        - Chose correct one
                    - No timer

                    - Same change for the prompt challenge. We don't have a timer here but the user should be able to leave the activity mid way and resume his/her progress after trying to get back to it. 

                - Golden Points
                    - Will be active in breakout rooms
                    - Users type pain points
                    - Points given on submission
                    - AI will score based on quality of text user gives

                    - The Golden Points Activity is to get some real pain points from the agents attending the event. We plan to capture their pain points and how technology and AI can be used. For this, the user types thier answer and that answer is reviewed by a AI Agent. The scoring is returned in the output and the points are given accordingly. For this, we need to think of a standard way of doing this. 

                    I have a sample prompt ready for this, which we will use for evalauting and scoring thier answers. Lets think about this first and see what all things I need to consider, what all can I do, etc

                - Touch Points
                    - Still not decided but will share with you soon
                    - Will have points as well
    

        - Profile
            - Profile Picture
            - Total activities done by user
            - Total points earned
            - Leaderboard
                - Top 5 scorers
                - User's position on the leaderboard

            - All Sponsors
                - List of all Sponsors
                - Each collapsible card with all info about the sponsor
        


Data Schema
- User
    - Name, Email
    - AI Avatar (generated in activity)
    - Points earned
    - Leaderboard standing


- Agenda
    - Event
        - Name, Location, From Time - To Time
    - 3 days, every day has multiple events

- Initiatives
    - Name, Context, Video, Splash link
    
- Activity
    - Name, Type, Score associated with it, Time based on not, Timer


