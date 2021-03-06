defmodule AlchemyBook.Router do
  use AlchemyBook.Web, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_flash
    plug :protect_from_forgery
    plug :put_secure_browser_headers
    plug AlchemyBook.Auth, repo: AlchemyBook.Repo
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/", AlchemyBook do
    pipe_through [:browser] # use default browser stack

    get "/", PageController, :index
    resources "/users", UserController, only: [:new, :create]
    resources "/sessions", SessionController, only: [:new, :create, :delete]
    resources "/documents", DocumentController, only: [:new, :create, :show, :index]
  end

  scope "/api", AlchemyBook do
    pipe_through :api

    post "/reporterror", ReportErrorController, :handle
  end
end
