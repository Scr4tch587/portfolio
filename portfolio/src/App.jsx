import './App.css'

function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-gray-900">
      {/* centered container with constrained width */}
  <div className="w-full max-w-xl px-4 mx-auto">
  {/* header left-aligned to match the paragraph block */}
  <h1 className="text-4xl font-semibold text-left">Kai Zhang - WIP</h1>

        {/* links share the same left axis and are left-aligned */}
        <div className="mt-6 space-y-4 text-left">
          <p className="text-2xl font-medium">
            linkedin:{' '}
            <a
              className="text-blue-600 hover:underline"
              href="https://www.linkedin.com/in/kai-zhang-waterloo/"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://www.linkedin.com/in/kai-zhang-waterloo/
            </a>
          </p>

          <p className="text-2xl font-medium">
            github:{' '}
            <a
              className="text-blue-600 hover:underline"
              href="https://github.com/Scr4tch587"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://github.com/Scr4tch587
            </a>
          </p>

          <p className="text-2xl font-medium">
            music blog:{' '}
            <a
              className="text-blue-600 hover:underline"
              href="https://kaizhang.substack.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://kaizhang.substack.com/
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
