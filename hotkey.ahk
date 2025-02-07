^+!y::
{
    MouseGetPos &mouseX, &mouseY  ; Get current mouse position
    path := EnvGet("Path")
    Run Format('wt cmd /c yipyap', path)
    WinWait "ahk_class ConsoleWindowClass"
    WinMove mouseX, mouseY, 800, 600  ; Use mouse position for window location
}
