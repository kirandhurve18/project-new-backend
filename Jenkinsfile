pipeline{
  agent any 

stages{
  stage("pull"){
    steps{
      git branch: 'main', credentialsId: 'git-id', url: 'https://github.com/kirandhurve18/project-new-backend.git'      
       }
    }

  stage('Build') {
            steps { 
                withCredentials([string(credentialsId: 'docker-token', variable: 'DOCKER-TOKEN')]) {
                sh '''
                docker build -t myimage:latest .
                echo "$DOCKERHUB_TOKEN" | docker login -u "kirand18" --password-stdin
                docker tag myimage:latest kirand18/project-repository
                docker push kirand18/project-repository
                '''
                }                
            }
        }   
    }
}
