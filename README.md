MidTerm Answers
1. How much time your server spend to aggregate the data and render the page? (This one should be at least better than my sample page)
- Numbers: 5.82 secs
- How I measure: I measured the numbers from console in browser at the "Network" session; it is displayed at the bottom of the section that showed: "Finish: 5.82 s"


2. How much additional memory your server (or browser) use to aggregate the data?
- Numbers: 23.4 MB
- How I measure: I measured the numbers from console in browser at the "Memory" session; it is displayed also at the bottom of the "Select JavaScript VM instance" section 

3. How much data you transfer through the network? (Be careful about browser cache, you should measure it without browser cache)



Viola Chyu 璩君芮
http://stylisher.club/
http://3.23.162.33/
Solution to Running server in bg:
1. Utilize Nginx to proxy port 80
2. Use nohup to keep server alive while exitting terminal
Ref. https://stackoverflow.com/questions/26568135/keep-alive-express-process-after-close-the-terminal

